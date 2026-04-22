import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { models } from "./models";
import { SYSTEM_PROMPT } from "./prompt";
import OpenAI from "openai";
import { verifyToken, createClerkClient } from "@clerk/backend";

if (!process.env.CLERK_SECRET_KEY) {
  console.error(
    "[Socket] ERROR: CLERK_SECRET_KEY environment variable is not set!",
  );
  console.error(
    "[Socket] Socket.io authentication will fail without this key.",
  );
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// In-memory store for the port, representing the Mem0 graph/vector memory
// In a full production app, this would integrate with Neo4j or a Vector DB.
const memoryStore = new Map<string, string[]>();

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

    console.log(`[Socket] Token received for ${socket.id}, verifying...`);

    try {
      const verified = await verifyToken(token as string, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      console.log(`[Socket] Token verified for user: ${verified.sub}`);

      if (!verified.sub) {
        console.error(`[Socket] Auth failed: No sub in verified token`);
        return next(new Error("Authentication error: Invalid token"));
      }

      const user = await clerk.users.getUser(verified.sub);
      console.log(
        `[Socket] User fetched: ${user.id}, role: ${user.publicMetadata?.role}`,
      );

      if (
        user.publicMetadata?.role !== "patient" &&
        user.publicMetadata?.role !== "individual" &&
        user.publicMetadata?.role !== undefined
      ) {
        console.error(
          `[Socket] Auth failed for ${verified.sub}: User role is "${user.publicMetadata?.role}", expected "patient" or "individual"`,
        );
        return next(
          new Error(
            "Authentication error: User is not a patient or individual",
          ),
        );
      }

      socket.data.userId = verified.sub;
      console.log(
        `[Socket] Auth successful for ${socket.id} (User: ${verified.sub})`,
      );
      next();
    } catch (err) {
      console.error(`[Socket] Auth error for ${socket.id}:`, err);
      console.error(`[Socket] Error details:`, {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(
      `[Socket] Client connected: ${socket.id} (User: ${socket.data.userId})`,
    );

    // Helper function to convert base64 files to buffer
    const processFileData = (
      files: Array<{ name: string; type: string; size: number; data: string }>,
    ): string => {
      if (!files || files.length === 0) return "";

      const fileDescriptions = files
        .map((file) => {
          // Determine file type category
          let fileTypeCategory = "unknown";
          if (file.type.startsWith("image/")) fileTypeCategory = "image";
          else if (file.type.startsWith("text/") || file.type.includes("json"))
            fileTypeCategory = "text";
          else if (file.type.includes("pdf")) fileTypeCategory = "pdf";
          else if (file.type.includes("word") || file.type.includes("document"))
            fileTypeCategory = "document";

          return `\n- File: ${file.name} (Type: ${fileTypeCategory}, Size: ${file.size} bytes)`;
        })
        .join("");

      return `\n\nAttached Files:${fileDescriptions}\n\nPlease consider these files in your response.`;
    };

    // Port of `handle_query_ws` from adk_memo.py
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
        socket.emit("error", {
          message: "Unauthorized: missing authenticated user.",
          request_id,
        });
        return;
      }

      if (user_id && user_id !== authenticatedUserId) {
        socket.emit("error", {
          message: "Unauthorized: user_id does not match authenticated user.",
          request_id,
        });
        return;
      }

      const effectiveUserId = authenticatedUserId;

      if (!query) {
        socket.emit("error", {
          message: "Query is required.",
          request_id,
        });
        return;
      }

      console.log(
        `[Socket] Received query from ${effectiveUserId} using model ${model_id}: ${query}`,
      );
      if (files.length > 0) {
        console.log(`[Socket] Query includes ${files.length} file(s)`);
      }

      try {
        // Resolve the model provider based on models.ts
        const selectedModel =
          models.find((m) => m.id === model_id) || models[0];
        const openai = selectedModel.provider as OpenAI;

        // Tool definitions for Memory Management
        const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
          {
            type: "function",
            function: {
              name: "save_user_info",
              description:
                "Save important user information, memories, or preferences to the memory store.",
              parameters: {
                type: "object",
                properties: {
                  info: {
                    type: "string",
                    description: "The detailed information or memory to save.",
                  },
                },
                required: ["info"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "retrieve_user_info",
              description:
                "Retrieve stored information and memories about the user to provide context.",
              parameters: {
                type: "object",
                properties: {}, // No parameters needed, it fetches for the current user
              },
            },
          },
        ];

        // Build user message with file context
        const fileContext = processFileData(files);
        const userMessageContent = query + fileContext;

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userMessageContent },
        ];

        // First pass: Let the model decide if it needs to use tools (retrieve/save memory)
        socket.emit("status", {
          status: "Thinking...",
          request_id,
        });
        console.log(
          `[Socket] Sending initial request to model ${selectedModel.modelID}`,
        );

        // Let's implement manual tool handling logic since the proxy/models might not perfectly support runTools
        const initialStream = await openai.chat.completions.create({
          model: selectedModel.modelID,
          messages: messages,
          tools: tools,
          tool_choice: "auto",
          stream: true,
        });

        let toolCalls: any[] = [];
        let accumulatedContent = "";

        for await (const chunk of initialStream) {
          const delta = chunk.choices[0]?.delta as any;
          if (!delta) continue;

          if (delta.reasoning_content) {
            socket.emit("thinking_chunk", {
              text: delta.reasoning_content,
              request_id,
            });
          }

          if (delta.content) {
            accumulatedContent += delta.content;
            socket.emit("answer_chunk", {
              text: delta.content,
              request_id,
            });
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const index = tc.index;
              if (!toolCalls[index]) {
                toolCalls[index] = {
                  id: tc.id || "",
                  type: "function",
                  function: { name: tc.function?.name || "", arguments: "" },
                };
              }
              if (tc.id) toolCalls[index].id = tc.id;
              if (tc.function?.name)
                toolCalls[index].function.name += tc.function.name;
              if (tc.function?.arguments)
                toolCalls[index].function.arguments += tc.function.arguments;
            }
          }
        }

        toolCalls = toolCalls.filter(Boolean);

        console.log(
          `[Socket] Received initial response stream. Tool calls present:`,
          toolCalls.length > 0,
        );

        // Check if model wants to call tools
        if (toolCalls.length > 0) {
          console.log(
            `[Socket] Model requested ${toolCalls.length} tool call(s)`,
          );

          messages.push({
            role: "assistant",
            content: accumulatedContent || null,
            tool_calls: toolCalls,
          });

          for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            let functionResponse = "";

            if (functionName === "save_user_info") {
              socket.emit("status", {
                status: "Saving memory...",
                request_id,
              });
              try {
                const args = JSON.parse(toolCall.function.arguments);
                if (!memoryStore.has(effectiveUserId))
                  memoryStore.set(effectiveUserId, []);
                memoryStore.get(effectiveUserId)!.push(args.info);
                functionResponse = `Successfully saved memory: ${args.info}`;
              } catch (e) {
                functionResponse = "Failed to parse tool arguments.";
              }
            } else if (functionName === "retrieve_user_info") {
              socket.emit("status", {
                status: "Searching memories...",
                request_id,
              });
              const userMem = memoryStore.get(effectiveUserId) || [];
              functionResponse =
                userMem.length > 0
                  ? `User Memories:\n${userMem.join("\n")}`
                  : "No previous memories found for this user.";
            }

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: functionResponse,
            });
          }

          // Second pass: Get actual response stream
          console.log(
            `[Socket] Sending second request for actual response stream`,
          );
          socket.emit("status", {
            status: "Synthesizing response...",
            request_id,
          });
          const stream2 = await openai.chat.completions.create({
            model: selectedModel.modelID,
            messages: messages,
            stream: true,
          });

          console.log(`[Socket] Starting to receive stream...`);
          for await (const chunk of stream2) {
            const delta = chunk.choices[0]?.delta as any;
            if (!delta) continue;

            if (delta.reasoning_content) {
              socket.emit("thinking_chunk", {
                text: delta.reasoning_content,
                request_id,
              });
            }

            if (delta.content) {
              socket.emit("answer_chunk", {
                text: delta.content,
                request_id,
              });
            }
          }
        }

        console.log(`[Socket] Stream finished. Emitting done event.`);

        socket.emit("done", {
          status: "completed",
          request_id,
        });
      } catch (error: any) {
        console.error("[Socket] Error processing query:", error);
        socket.emit("error", {
          message: error.message || "An error occurred during generation.",
          request_id,
        });
      }
    });

    // Handle Proactive Prompt Generation
    socket.on("proactive_prompt", async (data) => {
      const { user_id = "default_user", model_id = "max" } = data;
      try {
        const selectedModel =
          models.find((m) => m.id === model_id) || models[0];
        const openai = selectedModel.provider as OpenAI;

        const mems = memoryStore.get(user_id) || [];
        const memoryContext =
          mems.length > 0 ? mems.join("\n") : "No previous memories.";

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

        socket.emit("proactive_response", {
          prompt: completion.choices[0].message.content,
        });
      } catch (error: any) {
        console.error("[Socket] Error generating proactive prompt:", error);
        socket.emit("error", {
          message: "Failed to generate proactive prompt.",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}
