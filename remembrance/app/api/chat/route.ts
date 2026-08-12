import { auth, currentUser } from "@clerk/nextjs/server";
import type OpenAI from "openai";
import { resolveModel, resolveUtilityModel } from "@/lib/ai/models";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import {
  MEMORY_TOOLS,
  saveUserInfo,
  retrieveUserInfo,
} from "@/lib/ai/memory-tools";

// Streams over a long-lived response; needs the node runtime and must
// never be statically optimized.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatBody {
  query: string;
  history?: { role: "user" | "assistant"; content: string }[];
  model_id?: string;
  request_id?: string;
  files?: { name: string; type: string; size: number }[];
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function describeFiles(files: ChatBody["files"]): string {
  if (!files || files.length === 0) return "";
  const lines = files
    .map((f) => `\n- File: ${f.name} (Type: ${f.type}, Size: ${f.size} bytes)`)
    .join("");
  return `\n\nAttached Files:${lines}\n\nPlease consider these files in your response.`;
}

/**
 * Serverless chat fallback: same conversation contract as the websocket
 * backend (thinking/answer/done/title events, save/retrieve memory tools)
 * but over a plain SSE response, so chat works on Vercel with no separate
 * backend process. The frontend uses this whenever NEXT_PUBLIC_BACKEND_URL
 * is not configured.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query, history = [], model_id = "max", request_id } = body;
  if (!query || typeof query !== "string") {
    return Response.json({ error: "query is required" }, { status: 400 });
  }

  const resolved = resolveModel(model_id);
  if (!resolved) {
    return Response.json(
      {
        error:
          "No inference provider configured. Set DIGITALOCEAN_KEY, HACKCLUB_KEY, or OPENAI_API_KEY.",
      },
      { status: 503 },
    );
  }

  const user = await currentUser();
  const ensureUser = {
    email: user?.emailAddresses?.[0]?.emailAddress || "unknown@unknown.com",
    name:
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null,
    role: (user?.publicMetadata?.role as string) || "individual",
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sse(event, { ...data, request_id })));
      };

      try {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: query + describeFiles(body.files) },
        ];

        emit("status", { status: "Thinking..." });

        const initialStream = await resolved.provider.chat.completions.create({
          model: resolved.modelID,
          messages,
          tools: MEMORY_TOOLS,
          tool_choice: "auto",
          stream: true,
        });

        let toolCalls: any[] = [];
        let accumulated = "";

        for await (const chunk of initialStream) {
          const delta = chunk.choices[0]?.delta as any;
          if (!delta) continue;
          if (delta.reasoning_content) {
            emit("thinking_chunk", { text: delta.reasoning_content });
          }
          if (delta.content) {
            accumulated += delta.content;
            emit("answer_chunk", { text: delta.content });
          }
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const i = tc.index;
              if (!toolCalls[i]) {
                toolCalls[i] = {
                  id: "",
                  type: "function",
                  function: { name: "", arguments: "" },
                };
              }
              if (tc.id) toolCalls[i].id = tc.id;
              if (tc.function?.name) {
                const existing: string = toolCalls[i].function.name;
                const incoming: string = tc.function.name;
                if (!existing) toolCalls[i].function.name = incoming;
                else if (
                  !existing.endsWith(incoming) &&
                  !incoming.startsWith(existing)
                )
                  toolCalls[i].function.name = existing + incoming;
                else if (incoming.length > existing.length)
                  toolCalls[i].function.name = incoming;
              }
              if (tc.function?.arguments)
                toolCalls[i].function.arguments += tc.function.arguments;
            }
          }
        }

        toolCalls = toolCalls.filter(Boolean);

        if (toolCalls.length > 0) {
          messages.push({
            role: "assistant",
            content: accumulated || null,
            tool_calls: toolCalls,
          });

          for (const toolCall of toolCalls) {
            let toolResponse = "";
            if (toolCall.function.name === "save_user_info") {
              emit("status", { status: "Saving memory..." });
              try {
                const args = JSON.parse(toolCall.function.arguments);
                const result = await saveUserInfo(userId, args.info, ensureUser);
                toolResponse = result.toolResponse;
                emit("notification", {
                  type: "memory_saved",
                  title: "Memory Saved",
                  message: String(args.info).substring(0, 100),
                });
              } catch {
                toolResponse = "Failed to parse arguments.";
              }
            } else if (toolCall.function.name === "retrieve_user_info") {
              emit("status", { status: "Searching memories..." });
              toolResponse = await retrieveUserInfo(userId);
            } else {
              toolResponse = `Unknown tool: ${toolCall.function.name}`;
            }
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: toolResponse,
            });
          }

          emit("status", { status: "Synthesizing response..." });
          const stream2 = await resolved.provider.chat.completions.create({
            model: resolved.modelID,
            messages,
            stream: true,
          });

          let accumulated2 = "";
          for await (const chunk of stream2) {
            const delta = chunk.choices[0]?.delta as any;
            if (!delta) continue;
            if (delta.reasoning_content)
              emit("thinking_chunk", { text: delta.reasoning_content });
            if (delta.content) {
              accumulated2 += delta.content;
              emit("answer_chunk", { text: delta.content });
            }
          }
          if (accumulated2) accumulated = accumulated2;
        }

        emit("done", { status: "completed" });

        // Title for brand-new conversations, same contract as the socket path
        if (history.length === 0 && query) {
          const utility = resolveUtilityModel();
          if (utility) {
            try {
              const context = accumulated
                ? `User: ${query.slice(0, 200)}\nAssistant: ${accumulated.slice(0, 200)}`
                : `User: ${query.slice(0, 300)}`;
              const titleRes = await utility.provider.chat.completions.create({
                model: utility.modelID,
                messages: [
                  {
                    role: "user",
                    content: `Give this conversation a short title (3-5 words max, no quotes, no punctuation at end):\n${context}`,
                  },
                ],
                max_tokens: 20,
                temperature: 0.3,
              });
              const title = titleRes.choices?.[0]?.message?.content?.trim();
              if (title) emit("title", { title });
            } catch (e) {
              console.error("[Chat] title generation failed:", e);
            }
          }
        }
      } catch (error: any) {
        console.error("[Chat] stream error:", error);
        emit("error", {
          message: error?.message || "An error occurred during generation.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
