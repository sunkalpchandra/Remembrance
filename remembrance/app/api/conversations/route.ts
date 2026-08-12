import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/conversations - Fetch all conversations for the authenticated user
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: You must be signed in to view conversations." },
        { status: 401 }
      );
    }

    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.date));

    return NextResponse.json(
      {
        success: true,
        data: userConversations,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: You must be signed in to create a conversation." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string." },
        { status: 400 }
      );
    }

    const insertedConversation = await db
      .insert(conversations)
      .values({
        userId,
        name: name.trim(),
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: insertedConversation[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
