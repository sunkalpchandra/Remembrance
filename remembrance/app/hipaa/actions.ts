"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function acceptHipaaAgreement() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const now = new Date();

  // Persist timestamp to DB for audit trail
  await db
    .update(users)
    .set({ hipaaSignedAt: now })
    .where(eq(users.id, userId));

  // Merge into existing metadata — a bare object would wipe role/onboardingComplete
  const client = await clerkClient();
  const existing = (await client.users.getUser(userId)).publicMetadata ?? {};
  await client.users.updateUser(userId, {
    publicMetadata: {
      ...existing,
      hipaaAccepted: true,
      hipaaAcceptedAt: now.toISOString(),
    },
  });

  return { success: true };
}
