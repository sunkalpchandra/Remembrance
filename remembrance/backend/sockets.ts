import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { models } from "./models";
import { SYSTEM_PROMPT } from "./prompt";
import OpenAI from "openai";
import { verifyToken, createClerkClient } from "@clerk/backend";
import MemoryClient from "mem0ai";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import { memories, notifications, users } from "../db/schema";
import { upsertMemoryNode } from "./neo4j";

if (!process.env.CLERK_SECRET_KEY) {
  console.error("[Socket] ERROR: CLERK_SECRET_KEY environment variable is not set!");
}
if (!process.env.MEM0_API_KEY) {
  console.error("[Socket] ERROR: MEM0_API_KEY environment variable is not set!");
}
if (!process.env.DATABASE_URL) {
  console.error("[Socket] ERROR: DATABASE_URL environment variable is not set!");
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! });

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle({ client: pool });

export function initSockets(server: HttpServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use(async (socket, next) => {
    console.log(`[Socket] Auth middleware - Socket ID: ${socket.id}`);

    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      console.error(`[Socket] Auth failed for ${socket.id}: No token provided`);
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const verified = await verifyToken(token as string, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (!verified.sub) {
        return next(new Error("Authentication error: Invalid token"));
      }

      const user = await clerk.users.getUser(verified.sub);

      if (
        user.publicMetadata?.role !== "patient" &&
        user.publicMetadata?.role !== "individual" &&
        user.publicMetadata?.role !== undefined
      ) {
        return next(new Error("Authentication error: User is not a patient or individual"));
      }

      socket.data.userId = verified.sub;
      console.log(`[Socket] Auth successful for ${socket.id} (User: ${verified.sub})`);
      next();
    } catch (err) {
      console.error(`[Socket] Auth error for ${socket.id}:`, err);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id} (User: ${socket.data.userId})`);

    const processFileData = (
      files: Array<{ name: string; type: string; size: number; data: string }>,
    ): string => {
      if (!files || files.length === 0) return "";

      const fileDescriptions = files
        .map((file) => {
          let fileTypeCategory = "unknown";
          if (file.type.startsWith("image/")) fileTypeCategory = "image";
          else if (file.type.startsWith("text/") || file.type.includes("json")) fileTypeCategory = "text";
          else if (file.type.includes("pdf")) fileTypeCategory = "pdf";
          else if (file.type.includes("word") || file.type.includes("document")) fileTypeCategory = "document";
          return `\n- File: ${file.name} (Type: ${fileTypeCategory}, Size: ${file.size} bytes)`;
        })
        .join("");

      return `\n\nAttached Files:${fileDescriptions}\n\nPlease consider these files in your response.`;
    };

    socket.on("query_ws", async (data) => {
      const {
        user_id,
        query,
        model_id = "glm-5",
        history = [],
        request_id,
        files = [],
      } = data;

      const authenticatedUserId = socket.data.userId as string | undefined;

      if (!authenticatedUserId) {
        socket.emit("error", { message: "Unauthorized: missing authenticated user.", request_id });
        return;
      }

      if (user_id && user_id !== authenticatedUserId) {
        socket.emit("error", { message: "Unauthorized: user_id does not match authenticated user.", request_id });
        return;
      }

      const effectiveUserId = authenticatedUserId;

      if (!query) {
        socket.emit("error", { message: "Query is required.", request_id });
        return;
      }

      console.log(`[Socket] Received query from ${effectiveUserId} using model ${model_id}: ${query}`);

      try {
        const selectedModel = models.find((m) => m.id === model_id) || models[0];
        const openai = selectedModel.provider as OpenAI;

        const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
          {
            type: "function",
            function: {
              name: "save_user_info",
              description: "Save important user information, memories, or preferences to the memory store.",
              parameters: {
                type: "object",
                properties: {
                  info: { type: "string", description: "The detailed information or memory to save." },
                },
                required: ["info"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "retrieve_user_info",
              description: "Retrieve stored information and memories about the user to provide context.",
              parameters: { type: "object", properties: {} },
            },
          },
        ];

        const fileContext = processFileData(files);
        const userMessageContent = query + fileContext;

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userMessageContent },
        ];

        socket.emit("status", { status: "Thinking...", request_id });

        const initialStream = await openai.chat.completions.create({
          model: selectedModel.modelID,
          messages,
          tools,
          tool_choice: "auto",
          stream: true,
        });

        let toolCalls: any[] = [];
        let accumulatedContent = "";

        for await (const chunk of initialStream) {
          const delta = chunk.choices[0]?.delta as any;
          if (!delta) continue;

          if (delta.reasoning_content) {
            socket.emit("thinking_chunk", { text: delta.reasoning_content, request_id });
          }
          if (delta.content) {
            accumulatedContent += delta.content;
            socket.emit("answer_chunk", { text: delta.content, request_id });
          }
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const index = tc.index;
              if (!toolCalls[index]) {
                toolCalls[index] = { id: "", type: "function", function: { name: "", arguments: "" } };
              }
              if (tc.id) toolCalls[index].id = tc.id;
              if (tc.function?.name) {
                // Some proxies (HackClub/Gemini) re-send the full name in multiple deltas.
                // Only append if it's not already a prefix of the current accumulator.
                const existing: string = toolCalls[index].function.name;
                const incoming: string = tc.function.name;
                if (!existing) {
                  toolCalls[index].function.name = incoming;
                } else if (!existing.endsWith(incoming) && !incoming.startsWith(existing)) {
                  toolCalls[index].function.name = existing + incoming;
                } else if (incoming.length > existing.length) {
                  toolCalls[index].function.name = incoming;
                }
                // else: duplicate — ignore
              }
              if (tc.function?.arguments) toolCalls[index].function.arguments += tc.function.arguments;
            }
          }
        }

        toolCalls = toolCalls.filter(Boolean);

        console.log(`[Socket] ====== TOOL CALL SUMMARY ======`);
        console.log(`[Socket] Model: ${selectedModel.modelID}`);
        console.log(`[Socket] User: ${effectiveUserId}`);
        console.log(`[Socket] Tool calls made: ${toolCalls.length}`);
        console.log(`[Socket] Accumulated content length (1st stream): ${accumulatedContent.length}`);
        toolCalls.forEach((tc, i) => {
          console.log(`[Socket]   [${i}] ${tc.function.name}(${tc.function.arguments})`);
        });
        console.log(`[Socket] ================================`);

        if (toolCalls.length === 0) {
          console.warn(`[Socket] WARNING: Model made NO tool calls. retrieve_user_info / save_user_info were not invoked.`);
        }

        if (toolCalls.length > 0) {
          messages.push({
            role: "assistant",
            content: accumulatedContent || null,
            tool_calls: toolCalls,
          });

          for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            let functionResponse = "";

            if (functionName === "save_user_info") {
              socket.emit("status", { status: "Saving memory...", request_id });
              let infoText = "";
              try {
                const args = JSON.parse(toolCall.function.arguments);
                infoText = args.info;
                console.log(`[Save] Attempting save for user=${effectiveUserId} info="${infoText}"`);
              } catch (e) {
                console.error("[Save] Failed to parse tool arguments:", toolCall.function.arguments, e);
                functionResponse = "Failed to parse arguments.";
                messages.push({ role: "tool", tool_call_id: toolCall.id, content: functionResponse });
                continue;
              }

              // 1. Ensure user exists in DB (avoid FK violation if Clerk webhook hasn't synced yet)
              try {
                const clerkUser = await clerk.users.getUser(effectiveUserId);
                await db
                  .insert(users)
                  .values({
                    id: effectiveUserId,
                    email: clerkUser.emailAddresses[0]?.emailAddress || "unknown@unknown.com",
                    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
                    role: (clerkUser.publicMetadata?.role as any) || "individual",
                  })
                  .onConflictDoNothing();
                console.log(`[Save] User row ensured for ${effectiveUserId}`);
              } catch (e) {
                console.error("[Save] Failed to ensure user row:", e);
              }

              // 2. Save to Mem0 with infer:false so the raw memory is stored (no LLM extraction filter)
              try {
                const addResult = await mem0.add(
                  [{ role: "user", content: infoText }],
                  { userId: effectiveUserId, infer: false }
                );
                console.log(`[Mem0] add result:`, JSON.stringify(addResult, null, 2));
              } catch (e: any) {
                console.error("[Mem0] add FAILED:", e?.message || e, e?.stack);
              }

              // 3. Persist to DB memories table
              let newMemoryId: string | null = null;
              try {
                const inserted = await db
                  .insert(memories)
                  .values({
                    userId: effectiveUserId,
                    name: infoText.substring(0, 80),
                    summary: infoText,
                    content: { text: infoText },
                  })
                  .returning({ id: memories.id });
                console.log(`[DB] memories row inserted:`, inserted);
                newMemoryId = inserted?.[0]?.id || null;
              } catch (e: any) {
                console.error("[DB] memories insert FAILED:", e?.message || e, e?.stack);
              }

              // 3b. Sync to Neo4j so the repository graph view updates live
              if (newMemoryId) {
                try {
                  await upsertMemoryNode(
                    effectiveUserId,
                    newMemoryId,
                    infoText,
                    infoText.substring(0, 80),
                  );
                } catch (e: any) {
                  console.error("[Neo4j] save failed:", e?.message || e);
                }
              }

              // 4. Notification
              try {
                await db.insert(notifications).values({
                  userId: effectiveUserId,
                  type: "memory_saved",
                  title: "Memory Saved",
                  message: infoText.substring(0, 150),
                });
              } catch (e: any) {
                console.error("[DB] notifications insert FAILED:", e?.message || e);
              }

              socket.emit("notification", {
                type: "memory_saved",
                title: "Memory Saved",
                message: infoText.substring(0, 100),
                request_id,
              });

              functionResponse = `Successfully saved memory: ${infoText}`;
            } else if (functionName === "retrieve_user_info") {
              socket.emit("status", { status: "Searching memories...", request_id });
              try {
                const searchResult = await mem0.search(
                  "personal information, memories, preferences, family, places, identity",
                  { filters: { user_id: effectiveUserId }, topK: 50 }
                );
                console.log(`[Mem0] search result for ${effectiveUserId}:`, JSON.stringify(searchResult, null, 2));
                const userMems = searchResult?.results || [];

                // Fallback: if search returns nothing, pull from DB memories table
                let memLines = userMems.map((m: any) => m.memory || "").filter(Boolean);

                if (memLines.length === 0) {
                  console.log(`[Retrieve] Mem0 returned 0 — falling back to DB memories table`);
                  const dbMems = await db
                    .select()
                    .from(memories)
                    .where(eq(memories.userId, effectiveUserId))
                    .orderBy(desc(memories.createdAt))
                    .limit(50);
                  console.log(`[Retrieve] DB memories for user: ${dbMems.length} rows`);
                  memLines = dbMems.map((m: any) => m.summary || m.name || "").filter(Boolean);
                }

                functionResponse = memLines.length > 0
                  ? `User Memories:\n${memLines.join("\n")}`
                  : "No previous memories found for this user.";
                console.log(`[Retrieve] Final mem count returned to model: ${memLines.length}`);
              } catch (e: any) {
                console.error("[Retrieve] Failed:", e?.message || e, e?.stack);
                functionResponse = "No previous memories found for this user.";
              }
            }

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: functionResponse,
            });
          }

          socket.emit("status", { status: "Synthesizing response...", request_id });
          const stream2 = await openai.chat.completions.create({
            model: selectedModel.modelID,
            messages,
            stream: true,
          });

          for await (const chunk of stream2) {
            const delta = chunk.choices[0]?.delta as any;
            if (!delta) continue;
            if (delta.reasoning_content) {
              socket.emit("thinking_chunk", { text: delta.reasoning_content, request_id });
            }
            if (delta.content) {
              socket.emit("answer_chunk", { text: delta.content, request_id });
            }
          }
        }

        socket.emit("done", { status: "completed", request_id });
      } catch (error: any) {
        console.error("[Socket] Error processing query:", error);
        socket.emit("error", { message: error.message || "An error occurred during generation.", request_id });
      }
    });

    socket.on("proactive_prompt", async (data) => {
      const { user_id, model_id = "max" } = data;
      const effectiveUserId = user_id || socket.data.userId;
      try {
        const selectedModel = models.find((m) => m.id === model_id) || models[0];
        const openai = selectedModel.provider as OpenAI;

        let memoryContext = "No previous memories.";
        try {
          const searchResult = await mem0.search(
            "personal information, memories, preferences, family, places",
            { filters: { user_id: effectiveUserId }, topK: 50 }
          );
          const userMems = searchResult?.results || [];
          if (userMems.length > 0) {
            const memLines = userMems.map((m: any) => m.memory || "").filter(Boolean);
            if (memLines.length > 0) memoryContext = memLines.join("\n");
          }
        } catch (e) {
          console.error("[Socket] Failed to retrieve memories for proactive prompt:", e);
        }

        const completion = await openai.chat.completions.create({
          model: selectedModel.modelID,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Generate a gentle, proactive memory prompt based on the user's memories:\n\n${memoryContext}\n\nKeep it conversational and engaging.`,
            },
          ],
        });

        socket.emit("proactive_response", { prompt: completion.choices[0].message.content });
      } catch (error: any) {
        console.error("[Socket] Error generating proactive prompt:", error);
        socket.emit("error", { message: "Failed to generate proactive prompt." });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}
