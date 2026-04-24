"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "../../db";
import { users, conversations, memories } from "../../db/schema";
import { eq } from "drizzle-orm";
import MemoryClient from "mem0ai";

const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! });

async function deleteMem0ForUser(userId: string) {
  try {
    await mem0.deleteAll({ user_id: userId });
  } catch (e) {
    console.error("[Mem0] deleteAll failed:", e);
  }
}

export async function deleteAllConversations() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    await db.delete(conversations).where(eq(conversations.userId, userId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete conversations." };
  }
}

export async function deleteAllMemories() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    await db.delete(memories).where(eq(memories.userId, userId));
    await deleteMem0ForUser(userId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete memories." };
  }
}

export async function deleteAccount() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized: You must be signed in to delete your account.");

    await deleteMem0ForUser(userId);
    await db.delete(users).where(eq(users.id, userId));

    const client = await clerkClient();
    await client.users.deleteUser(userId);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting account:", error);
    return { success: false, error: error?.message || "Failed to delete account. Please try again." };
  }
}
