"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "../db";
import { messages, conversations, patients, caregiverEvents } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { isUuid } from "./lib/validate";

/**
 * Creates a new conversation for the authenticated user.
 */
export async function createConversation(name: string, id?: string) {
  try {
    const { userId } = await auth();

    if (id && !isUuid(id)) {
      return { success: false, error: "Invalid conversation ID format" };
    }

    if (!userId) {
      throw new Error(
        "Unauthorized: You must be signed in to create a conversation.",
      );
    }

    const insertedConversation = await db
      .insert(conversations)
      .values({
        ...(id ? { id } : {}),
        userId,
        name,
      })
      .returning();

    // Fire-and-forget analytics: log under the patient's caregiver if one exists
    const patientRow = await db
      .select({ caregiverId: patients.caregiverId })
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);
    if (patientRow[0]?.caregiverId) {
      db.insert(caregiverEvents).values({
        caregiverId: patientRow[0].caregiverId,
        actorId: userId,
        event: "conversation_created",
        patientId: userId,
        metadata: { name },
      }).catch(() => {});
    }

    return { success: true, data: insertedConversation[0] };
  } catch (error) {
    console.error("Error creating conversation:", error);
    return { success: false, error: "Failed to create conversation" };
  }
}

/**
 * Gets all conversations for the authenticated user.
 */
export async function getConversations() {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error(
        "Unauthorized: You must be signed in to view conversations.",
      );
    }

    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.date));

    return { success: true, data: userConversations };
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return { success: false, error: "Failed to fetch conversations" };
  }
}

/**
 * Gets a specific conversation by ID for the authenticated user.
 */
export async function getConversationById(conversationId: string) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error(
        "Unauthorized: You must be signed in to view conversations.",
      );
    }

    if (!isUuid(conversationId)) {
      return { success: false, error: "Invalid conversation ID format" };
    }

    const conversation = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId),
        ),
      )
      .limit(1);

    if (!conversation[0]) {
      return { success: true, data: null };
    }

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.userId, userId),
        ),
      )
      .orderBy(messages.createdAt);

    return {
      success: true,
      data: {
        ...conversation[0],
        messages: conversationMessages.map((msg) => ({
          sentByUser: msg.sentByUser,
          text: msg.text || "",
          status: msg.status || "Done",
          thinkingText: msg.thinkingText || undefined,
          request_id: msg.requestId || undefined,
          streamState: "done" as const,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return { success: false, error: "Failed to fetch conversation" };
  }
}

/**
 * Renames a specific conversation.
 */
export async function renameConversation(conversationId: string, name: string) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error(
        "Unauthorized: You must be signed in to rename conversations.",
      );
    }

    if (!isUuid(conversationId)) {
      return { success: false, error: "Invalid conversation ID format" };
    }

    const updated = await db
      .update(conversations)
      .set({ name })
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId),
        ),
      )
      .returning();

    return { success: true, data: updated[0] };
  } catch (error) {
    console.error("Error renaming conversation:", error);
    return { success: false, error: "Failed to rename conversation" };
  }
}

/**
 * Deletes a specific conversation and all its messages (via cascade).
 */
export async function deleteConversationAction(conversationId: string) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error(
        "Unauthorized: You must be signed in to delete conversations.",
      );
    }

    if (!isUuid(conversationId)) {
      return { success: false, error: "Invalid conversation ID format" };
    }

    await db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId),
        ),
      );

    return { success: true };
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return { success: false, error: "Failed to delete conversation" };
  }
}

/**
 * Saves a new message within a specific conversation.
 * Built to handle massive text payloads (up to 1M+ tokens via Postgres TOAST).
 */
export async function saveMessage(
  conversationId: string,
  text: string,
  sentByUser: boolean = true,
) {
  try {
    const { userId } = await auth();

    if (!isUuid(conversationId)) {
      return { success: false, error: "Invalid conversation ID format" };
    }

    if (!userId) {
      throw new Error("Unauthorized: You must be signed in to save a message.");
    }

    const insertedMessages = await db
      .insert(messages)
      .values({
        conversationId,
        userId,
        text,
        sentByUser,
      })
      .returning();

    return { success: true, data: insertedMessages[0] };
  } catch (error) {
    console.error("Error saving message:", error);
    return { success: false, error: "Failed to save message" };
  }
}

/**
 * Retrieves all messages for a specific conversation,
 * ordered from oldest to newest.
 */
export async function getMessages(conversationId: string) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Unauthorized: You must be signed in to view messages.");
    }

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.userId, userId),
        ),
      )
      .orderBy(messages.createdAt);

    return { success: true, data: conversationMessages };
  } catch (error) {
    console.error("Error fetching messages:", error);
    return { success: false, error: "Failed to fetch messages" };
  }
}

/**
 * Retrieves the profile for the authenticated patient user.
 */
export async function getPatientProfile() {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Unauthorized: You must be signed in to view profile.");
    }

    const profile = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);

    return { success: true, data: profile[0] || null };
  } catch (error) {
    console.error("Error fetching profile:", error);
    return { success: false, error: "Failed to fetch profile" };
  }
}
