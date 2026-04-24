import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { memories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { invalidateLabel } from "@/app/lib/label-cache";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(memories).where(and(eq(memories.id, id), eq(memories.userId, userId)));
  invalidateLabel(id);
  return Response.json({ success: true });
}
