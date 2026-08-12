import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { memories, topics, memoryTopics, patients, caregiverEvents } from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";

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
    // Update existing row only if it belongs to this user
    const updated = await db
      .update(memories)
      .set({ name, summary: summary ?? null, content: content ?? {} })
      .where(and(eq(memories.id, id), eq(memories.userId, userId)))
      .returning({ id: memories.id });
    if (updated.length === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    invalidateLabel(id);
    return Response.json({ id });
  }

  const [row] = await db
    .insert(memories)
    .values({ userId, name, summary: summary ?? null, content: content ?? {} })
    .returning({ id: memories.id });

  // Fire-and-forget analytics
  const patientRow = await db
    .select({ caregiverId: patients.caregiverId })
    .from(patients)
    .where(eq(patients.userId, userId))
    .limit(1);
  if (patientRow[0]?.caregiverId) {
    db.insert(caregiverEvents).values({
      caregiverId: patientRow[0].caregiverId,
      actorId: userId,
      event: "memory_created",
      patientId: userId,
      metadata: { name },
    }).catch(() => {});
  }

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

  const memoryIds = rows.map((m) => m.id);
  const links = memoryIds.length
    ? await db
        .select()
        .from(memoryTopics)
        .where(inArray(memoryTopics.memoryId, memoryIds))
    : [];

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
