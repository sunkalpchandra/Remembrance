"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "../../db";
import { users, conversations, memories, patients } from "../../db/schema";
import { eq, count } from "drizzle-orm";
import MemoryClient from "mem0ai";

const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! });

async function deleteMem0ForUser(userId: string) {
  try {
    await mem0.deleteAll({ userId });
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

export async function getPrivacyInfo() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const meta = clerkUser.publicMetadata as any;
    const role = meta?.role as string | undefined;

    const [[convRow], [memRow]] = await Promise.all([
      db.select({ c: count() }).from(conversations).where(eq(conversations.userId, userId)),
      db.select({ c: count() }).from(memories).where(eq(memories.userId, userId)),
    ]);
    const conversationCount = Number(convRow?.c ?? 0);
    const memoryCount = Number(memRow?.c ?? 0);

    let caregiverInfo: { name: string | null; email: string } | null = null;
    let patientList: { id: string; name: string | null }[] = [];
    let hipaaAcceptedAt: string | null = meta?.hipaaAcceptedAt ?? null;

    if (role === "patient") {
      const patientRow = await db
        .select({ caregiverId: patients.caregiverId })
        .from(patients)
        .where(eq(patients.userId, userId))
        .limit(1);
      const caregiverId = patientRow[0]?.caregiverId;
      if (caregiverId) {
        const [cgRow] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, caregiverId))
          .limit(1);
        if (cgRow) caregiverInfo = cgRow;
      }
    }

    if (role === "caregiver") {
      const rows = await db
        .select({ id: patients.userId, name: patients.patientName })
        .from(patients)
        .where(eq(patients.caregiverId, userId));
      patientList = rows;
    }

    return {
      success: true,
      role,
      conversationCount,
      memoryCount,
      hipaaAcceptedAt,
      caregiverInfo,
      patientList,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load privacy info." };
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
