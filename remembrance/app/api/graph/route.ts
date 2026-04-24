import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { memories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { labelCache } from "@/app/lib/label-cache";

// ── Classification ────────────────────────────────────────────────────────────
type MemoryType = "family" | "event" | "health" | "place" | "work" | "emotion" | "social" | "memory";

const EMOJI: Record<MemoryType, string> = {
  family: "👨‍👩‍👧", event: "🎉", health: "💊", place: "📍",
  work: "💼", emotion: "❤️", social: "🤝", memory: "🧠",
};

function classify(name: string, summary: string): MemoryType {
  const t = (name + " " + summary).toLowerCase();
  if (/\b(son|daughter|wife|husband|mother|father|sister|brother|grandma|grandpa|grandparent|child|children|niece|nephew|family|spouse)\b/.test(t)) return "family";
  if (/\b(birthday|christmas|thanksgiving|holiday|anniversary|wedding|graduation|celebration|party|reunion)\b/.test(t)) return "event";
  if (/\b(hospital|doctor|medicine|health|illness|surgery|therapy|pain|diagnosis|nurse|clinic|medication)\b/.test(t)) return "health";
  if (/\b(home|house|garden|kitchen|bedroom|yard|neighborhood|street|city|town|village|park|beach|lake|mountain)\b/.test(t)) return "place";
  if (/\b(work|job|career|office|business|profession|employer|colleague|coworker|boss)\b/.test(t)) return "work";
  if (/\b(love|happy|happiness|joy|sad|fear|angry|emotion|felt|feeling|miss|proud|grateful|lonely)\b/.test(t)) return "emotion";
  if (/\b(friend|neighbor|community|church|club|group|school|teacher|student)\b/.test(t)) return "social";
  return "memory";
}

function extractEntities(name: string, summary: string): string[] {
  const STOP = new Set(["The","This","That","When","Where","Every","Some","Their","Also","Note","After","Before","During","Additional","Caregiver"]);
  const words = (name + " " + summary).match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  return [...new Set(words.filter(w => !STOP.has(w)).map(w => w.toLowerCase()))];
}

async function batchSummarize(items: { id: string; text: string }[]): Promise<void> {
  const uncached = items.filter(i => !labelCache.has(i.id));
  if (uncached.length === 0) return;

  try {
    const numbered = uncached.map((item, i) => `${i + 1}. ${item.text.replace(/\n/g, " ").substring(0, 200)}`).join("\n");
    const res = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.HACKCLUB_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{
          role: "user",
          content: `For each memory below, write a SHORT evocative title — like "San Francisco, 1995" or "Mom's Surgery" or "First Day at Google". Use real names, places, years, or events from the text. No filler words. 2-4 words max. Return ONLY a valid JSON array of strings in order, nothing else.\n\n${numbered}`,
        }],
        max_tokens: 400,
        temperature: 0.2,
      }),
    });

    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "[]";
    // Extract JSON array from response (model sometimes adds markdown)
    const match = raw.match(/\[[\s\S]*\]/);
    const labels: string[] = match ? JSON.parse(match[0]) : [];

    uncached.forEach((item, i) => {
      const label = typeof labels[i] === "string" && labels[i].trim() ? labels[i].trim() : item.text.substring(0, 24);
      labelCache.set(item.id, label);
    });
  } catch (e) {
    // Fall back to truncation if LLM fails
    uncached.forEach(item => {
      if (!labelCache.has(item.id)) labelCache.set(item.id, item.text.substring(0, 22));
    });
    console.warn("[graph/summarize] LLM failed, using truncation:", e);
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(desc(memories.createdAt));

  // Fire LLM labelling in background — don't block the response
  const uncached = rows.filter(m => !labelCache.has(m.id));
  if (uncached.length > 0) {
    batchSummarize(uncached.map(m => ({ id: m.id, text: m.name ?? m.summary ?? "" }))).catch(() => {});
  }

  const nodes: any[] = [];
  const links: any[] = [];
  const nodeIds = new Set<string>();

  const userNodeId = `user_${userId}`;
  nodes.push({ id: userNodeId, label: "You", type: "user", emoji: "👤" });
  nodeIds.add(userNodeId);

  const entityIndex = new Map<string, string[]>();

  for (const m of rows) {
    const nodeId = `mem_${m.id}`;
    const type = classify(m.name ?? "", m.summary ?? "");
    const shortLabel = labelCache.get(m.id) ?? (m.name ?? "").substring(0, 22);
    const content = m.summary ?? m.name ?? "";

    nodes.push({
      id: nodeId,
      label: shortLabel,
      type,
      emoji: EMOJI[type],
      memoryId: m.id,
      content,
    });
    nodeIds.add(nodeId);
    links.push({ source: userNodeId, target: nodeId });

    // Index for chaining
    for (const ent of extractEntities(m.name ?? "", m.summary ?? "")) {
      if (!entityIndex.has(ent)) entityIndex.set(ent, []);
      entityIndex.get(ent)!.push(nodeId);
    }
  }

  // Chain related memories sharing named entities
  const seen = new Set<string>();
  for (const [, ids] of entityIndex) {
    if (ids.length < 2) continue;
    for (let i = 0; i < Math.min(ids.length - 1, 3); i++) {
      const key = ids[i] < ids[i + 1] ? `${ids[i]}--${ids[i + 1]}` : `${ids[i + 1]}--${ids[i]}`;
      if (!seen.has(key)) {
        links.push({ source: ids[i], target: ids[i + 1], chain: true });
        seen.add(key);
      }
    }
  }

  return Response.json({ nodes, links });
}
