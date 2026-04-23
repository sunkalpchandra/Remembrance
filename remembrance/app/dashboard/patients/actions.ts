"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { patients, users, caregiverNotes, notifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import MemoryClient from "mem0ai";

const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! });

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

    const newClerkUser = await client.users.createUser({
      emailAddress: [email],
      password: password,
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" "),
      publicMetadata: {
        role: "patient",
        onboardingComplete: true,
      },
    });

    await db.insert(users).values({
      id: newClerkUser.id,
      email: email,
      name: name,
      role: "patient",
    }).onConflictDoNothing();

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

export async function createNote(patientId: string, title: string, content: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (!content.trim()) {
    return { error: "Note content cannot be empty" };
  }

  try {
    // Save note to DB
    await db.insert(caregiverNotes).values({
      caregiverId: userId,
      patientId,
      title: title.trim() || null,
      content: content.trim(),
    });

    // Sync note into patient's Mem0 memory so the AI companion can reference it
    const memText = title
      ? `Caregiver note — ${title}: ${content.trim()}`
      : `Caregiver note: ${content.trim()}`;
    try {
      const addResult = await mem0.add(
        [{ role: "user", content: memText }],
        { userId: patientId, infer: false }
      );
      console.log(`[CaregiverNote→Mem0] add result for ${patientId}:`, JSON.stringify(addResult));
    } catch (e: any) {
      console.error("[CaregiverNote→Mem0] add failed:", e?.message || e);
    }

    // Notify the patient
    await db.insert(notifications).values({
      userId: patientId,
      type: "note_added",
      title: "New Note from Your Caregiver",
      message: title || content.substring(0, 120),
      metadata: { caregiverId: userId },
    });

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create note:", error);
    return { error: error.message || "Failed to save note" };
  }
}

export async function getNotes(patientId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return await db
    .select()
    .from(caregiverNotes)
    .where(
      and(
        eq(caregiverNotes.patientId, patientId),
        eq(caregiverNotes.caregiverId, userId),
      )
    )
    .orderBy(desc(caregiverNotes.createdAt));
}
