import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: You must be signed in to rename conversations." },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string." },
        { status: 400 }
      );
    }

    const updated = await db
      .update(conversations)
      .set({ name: name.trim() })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Conversation not found or unauthorized." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated[0] }, { status: 200 });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: You must be signed in to delete conversations." },
        { status: 401 }
      );
    }

    const { id } = params;

    const deleted = await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Conversation not found or unauthorized." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
