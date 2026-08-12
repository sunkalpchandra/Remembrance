import type OpenAI from "openai";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import { memories, notifications, users } from "../../db/schema";
import { getMem0 } from "../mem0";

// One pool per process; both the Koa backend and Next.js API routes use this.
let _db: ReturnType<typeof drizzle> | null = null;
function db() {
  if (!_db) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
    _db = drizzle({ client: pool });
  }
  return _db;
}

export const MEMORY_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
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
      parameters: { type: "object", properties: {} },
    },
  },
];

export interface SaveResult {
  memoryId: string | null;
  toolResponse: string;
}

/**
 * Persist a memory for a user: Mem0 (if configured) + Postgres + an in-app
 * notification. Used by both the websocket backend and /api/chat.
 * `ensureUser` supplies user row data when the Clerk webhook may not have
 * synced yet (avoids the FK violation on first-ever message).
 */
export async function saveUserInfo(
  userId: string,
  infoText: string,
  ensureUser?: { email: string; name: string | null; role?: string },
): Promise<SaveResult> {
  if (ensureUser) {
    try {
      await db()
        .insert(users)
        .values({
          id: userId,
          email: ensureUser.email,
          name: ensureUser.name,
          role: (ensureUser.role as any) || "individual",
        })
        .onConflictDoNothing();
    } catch (e) {
      console.error("[Memory] Failed to ensure user row:", e);
    }
  }

  const mem0 = getMem0();
  if (mem0) {
    try {
      await mem0.add([{ role: "user", content: infoText }], {
        userId,
        infer: false,
      });
    } catch (e: any) {
      console.error("[Mem0] add failed:", e?.message || e);
    }
  }

  let memoryId: string | null = null;
  try {
    const inserted = await db()
      .insert(memories)
      .values({
        userId,
        name: infoText.substring(0, 80),
        summary: infoText,
        content: { text: infoText },
      })
      .returning({ id: memories.id });
    memoryId = inserted?.[0]?.id || null;
  } catch (e: any) {
    console.error("[Memory] insert failed:", e?.message || e);
  }

  try {
    await db().insert(notifications).values({
      userId,
      type: "memory_saved",
      title: "Memory Saved",
      message: infoText.substring(0, 150),
    });
  } catch (e: any) {
    console.error("[Memory] notification insert failed:", e?.message || e);
  }

  return { memoryId, toolResponse: `Successfully saved memory: ${infoText}` };
}

/**
 * Fetch a user's memories for model context: Mem0 search first, Postgres
 * fallback. Returns the tool response string.
 */
export async function retrieveUserInfo(userId: string): Promise<string> {
  let memLines: string[] = [];

  const mem0 = getMem0();
  if (mem0) {
    try {
      const searchResult = await mem0.search(
        "personal information, memories, preferences, family, places, identity",
        { filters: { user_id: userId }, topK: 50 },
      );
      memLines = (searchResult?.results || [])
        .map((m: any) => m.memory || "")
        .filter(Boolean);
    } catch (e: any) {
      console.error("[Mem0] search failed:", e?.message || e);
    }
  }

  if (memLines.length === 0) {
    try {
      const dbMems = await db()
        .select()
        .from(memories)
        .where(eq(memories.userId, userId))
        .orderBy(desc(memories.createdAt))
        .limit(50);
      memLines = dbMems
        .map((m: any) => m.summary || m.name || "")
        .filter(Boolean);
    } catch (e: any) {
      console.error("[Memory] DB fallback failed:", e?.message || e);
    }
  }

  return memLines.length > 0
    ? `User Memories:\n${memLines.join("\n")}`
    : "No previous memories found for this user.";
}
