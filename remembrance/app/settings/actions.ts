"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function deleteAccount() {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error(
        "Unauthorized: You must be signed in to delete your account.",
      );
    }

    // 1. Delete the user from the Postgres database.
    // Because of cascading deletes defined in the schema, this will automatically
    // clean up their patients, conversations, messages, memories, and topics.
    await db.delete(users).where(eq(users.id, userId));

    // 2. Delete the user directly from Clerk without relying on webhooks.
    // This immediately revokes their session and removes them from the auth provider.
    const client = await clerkClient();
    await client.users.deleteUser(userId);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting account:", error);
    return {
      success: false,
      error: error?.message || "Failed to delete account. Please try again.",
    };
  }
}
