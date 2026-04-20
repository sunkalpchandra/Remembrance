"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "../../db";
import { users, patients } from "../../db/schema";
import { eq } from "drizzle-orm";

/**
 * Completes the user's onboarding process by setting their role,
 * initializing their profile if needed, and updating Clerk metadata.
 */
export async function completeOnboarding(data: {
  role: "patient" | "caregiver" | "individual";
  patientName?: string;
  name: string;
  email: string;
}) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error(
        "Unauthorized: You must be signed in to complete onboarding.",
      );
    }

    const { role, name, email } = data;

    // 1. Upsert the user in the Postgres database
    await db
      .insert(users)
      .values({
        id: userId,
        email,
        name,
        role,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { role, name, email },
      });

    // 2. If they selected "patient" or "individual", initialize an empty HIPAA-ready profile
    // so they can immediately start saving memories and data.
    if (role === "patient" || role === "individual") {
      const existingProfile = await db
        .select()
        .from(patients)
        .where(eq(patients.userId, userId))
        .limit(1);

      if (existingProfile.length === 0) {
        await db.insert(patients).values({
          id: crypto.randomUUID(),
          userId,
          patientName: data.patientName,
        });
      }
    } else if (role === "caregiver") {
      // Caregivers can set up a patient profile linked to their account
      if (data.patientName) {
        await db.insert(patients).values({
          id: crypto.randomUUID(),
          userId, // Using the caregiver's ID as the primary user link for now
          caregiverId: userId,
          patientName: data.patientName,
        });
      }
    }

    // 3. Sync the role and completion status back to Clerk's publicMetadata
    // This allows middleware.ts to easily route them without hitting the DB.
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        onboardingComplete: true,
        role: role,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return {
      success: false,
      error: "Failed to complete onboarding. Please try again.",
    };
  }
}
