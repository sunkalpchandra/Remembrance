import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { memories, topics, memoryTopics } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { invalidateLabel } from "@/app/lib/label-cache";

// Upsert a repo-created or repo-edited memory into the DB so the graph stays in sync.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, name, summary, content } = body as {
    id?: string;
    name: string;
    summary?: string;
    content?: any;
  };

  if (!name) return Response.json({ error: "name required" }, { status: 400 });

  if (id) {
    // Update existing row if it belongs to this user
    await db
      .update(memories)
      .set({ name, summary: summary ?? null, content: content ?? {} })
      .where(eq(memories.id, id));
    invalidateLabel(id);
    return Response.json({ id });
  }

  const [row] = await db
    .insert(memories)
    .values({ userId, name, summary: summary ?? null, content: content ?? {} })
    .returning({ id: memories.id });

  return Response.json({ id: row.id });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(desc(memories.createdAt));

  // Also fetch topic associations
  const userTopics = await db
    .select()
    .from(topics)
    .where(eq(topics.userId, userId));

  const links = await db
    .select()
    .from(memoryTopics);

  const topicById = new Map(userTopics.map((t) => [t.id, t]));
  const topicsForMem = new Map<string, { id: string; name: string }[]>();
  for (const l of links) {
    const t = topicById.get(l.topicId);
    if (!t) continue;
    if (!topicsForMem.has(l.memoryId)) topicsForMem.set(l.memoryId, []);
    topicsForMem.get(l.memoryId)!.push({ id: t.id, name: t.name });
  }

  const shaped = rows.map((m) => ({
    id: m.id,
    ownerID: m.userId,
    name: m.name,
    summary: m.summary || "",
    content: m.content || {},
    topics: topicsForMem.get(m.id) || [],
    createdAt: m.createdAt,
  }));

  return Response.json({ memories: shaped });
}
