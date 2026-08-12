import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { resolveModel, resolveUtilityModel } from "../lib/ai/models";
import { SYSTEM_PROMPT } from "../lib/ai/prompt";
import {
  MEMORY_TOOLS,
  saveUserInfo,
  retrieveUserInfo,
} from "../lib/ai/memory-tools";
import { verifyToken, createClerkClient } from "@clerk/backend";
import { upsertMemoryNode } from "./neo4j";

if (!process.env.CLERK_SECRET_KEY) {
  console.error("[Socket] ERROR: CLERK_SECRET_KEY environment variable is not set!");
}
if (!process.env.DATABASE_URL) {
  console.error("[Socket] ERROR: DATABASE_URL environment variable is not set!");
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export function initSockets(server: HttpServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use(async (socket, next) => {
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
        model_id = "max",
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

      console.log(`[Socket] Query from ${effectiveUserId} using model ${model_id}`);

      try {
        const resolved = resolveModel(model_id);
        if (!resolved) {
          socket.emit("error", {
            message:
              "No inference provider configured. Set DIGITALOCEAN_KEY, HACKCLUB_KEY, or OPENAI_API_KEY.",
            request_id,
          });
          return;
        }

        const fileContext = processFileData(files);
        const userMessageContent = query + fileContext;

        const messages: any[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userMessageContent },
        ];

        socket.emit("status", { status: "Thinking...", request_id });

        const initialStream = await resolved.provider.chat.completions.create({
          model: resolved.modelID,
          messages,
          tools: MEMORY_TOOLS,
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
        console.log(`[Socket] ${toolCalls.length} tool call(s) from ${resolved.modelID}`);

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
              } catch (e) {
                console.error("[Save] Failed to parse tool arguments:", toolCall.function.arguments, e);
                messages.push({ role: "tool", tool_call_id: toolCall.id, content: "Failed to parse arguments." });
                continue;
              }

              // Fetch profile data so the shared helper can create the user
              // row if the Clerk webhook hasn't synced yet.
              let ensureUser;
              try {
                const clerkUser = await clerk.users.getUser(effectiveUserId);
                ensureUser = {
                  email: clerkUser.emailAddresses[0]?.emailAddress || "unknown@unknown.com",
                  name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
                  role: (clerkUser.publicMetadata?.role as string) || "individual",
                };
              } catch (e) {
                console.error("[Save] Failed to fetch Clerk user:", e);
              }

              const result = await saveUserInfo(effectiveUserId, infoText, ensureUser);

              // Sync to Neo4j so the repository graph view updates live
              if (result.memoryId) {
                try {
                  await upsertMemoryNode(
                    effectiveUserId,
                    result.memoryId,
                    infoText,
                    infoText.substring(0, 80),
                  );
                } catch (e: any) {
                  console.error("[Neo4j] save failed:", e?.message || e);
                }
              }

              socket.emit("notification", {
                type: "memory_saved",
                title: "Memory Saved",
                message: infoText.substring(0, 100),
                request_id,
              });

              functionResponse = result.toolResponse;
            } else if (functionName === "retrieve_user_info") {
              socket.emit("status", { status: "Searching memories...", request_id });
              functionResponse = await retrieveUserInfo(effectiveUserId);
            }

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: functionResponse,
            });
          }

          socket.emit("status", { status: "Synthesizing response...", request_id });
          const stream2 = await resolved.provider.chat.completions.create({
            model: resolved.modelID,
            messages,
            stream: true,
          });

          let accumulatedContent2 = "";
          for await (const chunk of stream2) {
            const delta = chunk.choices[0]?.delta as any;
            if (!delta) continue;
            if (delta.reasoning_content) {
              socket.emit("thinking_chunk", { text: delta.reasoning_content, request_id });
            }
            if (delta.content) {
              accumulatedContent2 += delta.content;
              socket.emit("answer_chunk", { text: delta.content, request_id });
            }
          }
          if (accumulatedContent2) accumulatedContent = accumulatedContent2;
        }

        // Accumulate full answer for title generation
        const fullAnswer = accumulatedContent;
        socket.emit("done", { status: "completed", request_id });

        // Generate a short title on the first message of a conversation
        if (history.length === 0 && query) {
          (async () => {
            const utility = resolveUtilityModel();
            if (!utility) return;
            try {
              const context = fullAnswer
                ? `User: ${query.slice(0, 200)}\nAssistant: ${fullAnswer.slice(0, 200)}`
                : `User: ${query.slice(0, 300)}`;
              const titleRes = await utility.provider.chat.completions.create({
                model: utility.modelID,
                messages: [{
                  role: "user",
                  content: `Give this conversation a short title (3-5 words max, no quotes, no punctuation at end):\n${context}`,
                }],
                max_tokens: 20,
                temperature: 0.3,
              });
              const title = titleRes.choices?.[0]?.message?.content?.trim();
              if (title) socket.emit("title", { title, request_id });
            } catch (e) {
              console.error("[Socket] Title generation failed:", e);
            }
          })();
        }
      } catch (error: any) {
        console.error("[Socket] Error processing query:", error);
        socket.emit("error", { message: error.message || "An error occurred during generation.", request_id });
      }
    });

    socket.on("proactive_prompt", async (data) => {
      const { user_id, model_id = "max" } = data;
      const effectiveUserId = user_id || socket.data.userId;
      try {
        const resolved = resolveModel(model_id);
        if (!resolved) {
          socket.emit("error", { message: "No inference provider configured." });
          return;
        }

        const memoryContext = await retrieveUserInfo(effectiveUserId);

        const completion = await resolved.provider.chat.completions.create({
          model: resolved.modelID,
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
