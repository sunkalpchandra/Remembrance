"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { patients, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getPatients() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const caregiverPatients = await db
    .select({
      id: patients.id,
      patientName: patients.patientName,
      email: users.email,
      createdAt: patients.createdAt,
    })
    .from(patients)
    .leftJoin(users, eq(patients.userId, users.id))
    .where(eq(patients.caregiverId, userId));

  return caregiverPatients;
}

export async function createPatientAccount(formData: FormData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Missing required fields" };
  }

  try {
    const client = await clerkClient();

    // Create the user account in Clerk
    const newClerkUser = await client.users.createUser({
      emailAddress: [email],
      password: password,
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" "),
      publicMetadata: {
        role: "patient",
        onboardingComplete: true, // Skip onboarding for caregiver-created patients
      },
    });

    // Ensure the user exists in our DB immediately to satisfy foreign key constraints.
    // (The Clerk webhook will also try to sync this, so we use onConflictDoNothing)
    await db.insert(users).values({
      id: newClerkUser.id,
      email: email,
      name: name,
      role: "patient",
    }).onConflictDoNothing();

    // Link the patient to the caregiver
    await db.insert(patients).values({
      id: newClerkUser.id,
      userId: newClerkUser.id,
      caregiverId: userId,
      patientName: name,
    });

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create patient:", error);
    return { error: error.errors?.[0]?.message || error.message || "Failed to create patient account" };
  }
}
