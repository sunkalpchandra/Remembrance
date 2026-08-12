"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, caregiverEvents } from "@/db/schema";
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

  // The agreement page tells the user their IP is recorded — make that
  // true: append an audit event with the requesting address.
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown";
    await db.insert(caregiverEvents).values({
      caregiverId: userId,
      event: "hipaa_accepted",
      metadata: { ip, acceptedAt: now.toISOString() },
    });
  } catch (e) {
    console.error("[HIPAA] audit event insert failed:", e);
  }

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
