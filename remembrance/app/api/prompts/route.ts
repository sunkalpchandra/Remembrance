import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { memories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { resolveUtilityModel } from "@/lib/ai/models";

export const dynamic = "force-dynamic";

// Gentle openers shown when the user has no memories yet (or no
// inference provider is configured). Reminiscence-therapy flavored.
const STARTER_PROMPTS = [
  "Tell me about a place you loved as a child",
  "What's a song that brings back memories?",
  "Who taught you something you never forgot?",
  "Describe a meal you'll always remember",
  "What did a typical Sunday look like growing up?",
  "Tell me about an old friend you think of fondly",
];

function pickStarters(): string[] {
  const shuffled = [...STARTER_PROMPTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

/**
 * Personalized conversation starters for the landing screen, generated
 * from the user's stored memories when possible.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let memoryLines: string[] = [];
  try {
    const rows = await db
      .select({ summary: memories.summary, name: memories.name })
      .from(memories)
      .where(eq(memories.userId, userId))
      .orderBy(desc(memories.createdAt))
      .limit(20);
    memoryLines = rows.map((m) => m.summary || m.name || "").filter(Boolean);
  } catch (e) {
    console.error("[Prompts] memory fetch failed:", e);
  }

  const utility = resolveUtilityModel();
  if (!utility || memoryLines.length === 0) {
    return Response.json({ prompts: pickStarters(), personalized: false });
  }

  try {
    const completion = await utility.provider.chat.completions.create(
      {
        model: utility.modelID,
        messages: [
          {
            role: "user",
            content: `You help run a reminiscence-therapy app. Based on these memories the user has shared:

${memoryLines.slice(0, 20).join("\n")}

Write exactly 3 short, warm conversation-starter questions (under 12 words each) inviting the user to reminisce about specific people, places, or moments above. No numbering, no quotes — one question per line.`,
          },
        ],
        max_tokens: 120,
        temperature: 0.7,
      },
      { timeout: 8000 },
    );

    const prompts = (completion.choices?.[0]?.message?.content || "")
      .split("\n")
      .map((l) => l.replace(/^[\s\-•\d.]+/, "").trim())
      .filter((l) => l.length > 8 && l.length < 90)
      .slice(0, 3);

    if (prompts.length > 0) {
      return Response.json({ prompts, personalized: true });
    }
  } catch (e) {
    console.error("[Prompts] generation failed:", e);
  }

  return Response.json({ prompts: pickStarters(), personalized: false });
}
