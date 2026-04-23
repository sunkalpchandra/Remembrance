import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { memories, topics, memoryTopics } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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
