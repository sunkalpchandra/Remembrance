"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { patients, users, caregiverNotes, notifications, caregiverEvents, memories } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getMem0 } from "@/lib/mem0";

async function deleteMem0ForUser(userId: string) {
  const mem0 = getMem0();
  if (!mem0) return;
  try {
    await mem0.deleteAll({ userId });
  } catch (e) {
    console.error("[Mem0] deleteAll failed:", e);
  }
}

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

    await db.insert(caregiverEvents).values({
      caregiverId: userId,
      event: "patient_created",
      patientId: newClerkUser.id,
      metadata: { patientName: name, email },
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
    const mem0 = getMem0();
    if (mem0) {
      try {
        const addResult = await mem0.add(
          [{ role: "user", content: memText }],
          { userId: patientId, infer: false }
        );
        console.log(`[CaregiverNote→Mem0] add result for ${patientId}:`, JSON.stringify(addResult));
      } catch (e: any) {
        console.error("[CaregiverNote→Mem0] add failed:", e?.message || e);
      }
    }

    // Notify the patient
    await db.insert(notifications).values({
      userId: patientId,
      type: "note_added",
      title: "New Note from Your Caregiver",
      message: title || content.substring(0, 120),
      metadata: { caregiverId: userId },
    });

    await db.insert(caregiverEvents).values({
      caregiverId: userId,
      event: "note_added",
      patientId,
      metadata: { hasTitle: !!title.trim() },
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

async function assertOwnsPatient(caregiverId: string, patientId: string) {
  const row = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.caregiverId, caregiverId)))
    .limit(1);
  if (!row[0]) throw new Error("Patient not found or not under your care");
}

export async function deletePatientAccount(patientId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await assertOwnsPatient(userId, patientId);

  try {
    await deleteMem0ForUser(patientId);
    await db.delete(users).where(eq(users.id, patientId));

    const client = await clerkClient();
    await client.users.deleteUser(patientId);

    await db.insert(caregiverEvents).values({
      caregiverId: userId,
      event: "patient_deleted",
      patientId,
    });

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete patient:", error);
    return { error: error.message || "Failed to delete patient account" };
  }
}

export async function updatePatient(patientId: string, data: { name?: string; email?: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await assertOwnsPatient(userId, patientId);

  try {
    const client = await clerkClient();

    if (data.name) {
      const parts = data.name.trim().split(" ");
      await client.users.updateUser(patientId, {
        firstName: parts[0],
        lastName: parts.slice(1).join(" ") || undefined,
      });
      await db
        .update(patients)
        .set({ patientName: data.name.trim() })
        .where(eq(patients.id, patientId));
      await db
        .update(users)
        .set({ name: data.name.trim() })
        .where(eq(users.id, patientId));
    }

    if (data.email) {
      // Add the new email address via Clerk then make it primary
      const clerkUser = await client.users.getUser(patientId);
      const existing = clerkUser.emailAddresses.find(
        (e) => e.emailAddress === data.email
      );
      let emailId = existing?.id;
      if (!emailId) {
        const added = await client.emailAddresses.createEmailAddress({
          userId: patientId,
          emailAddress: data.email,
          verified: true,
          primary: true,
        });
        emailId = added.id;
      }
      await client.users.updateUser(patientId, { primaryEmailAddressID: emailId });
      await db
        .update(users)
        .set({ email: data.email })
        .where(eq(users.id, patientId));
    }

    await db.insert(caregiverEvents).values({
      caregiverId: userId,
      event: "patient_updated",
      patientId,
      metadata: { fields: Object.keys(data) },
    });

    revalidatePath("/dashboard/patients");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update patient:", error);
    return { error: error.errors?.[0]?.message || error.message || "Failed to update patient" };
  }
}

export async function getPatientMemories(patientId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await assertOwnsPatient(userId, patientId);

  return await db
    .select()
    .from(memories)
    .where(eq(memories.userId, patientId))
    .orderBy(desc(memories.createdAt));
}

export async function updatePatientMemory(
  memoryId: string,
  patientId: string,
  data: { name: string; summary?: string }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await assertOwnsPatient(userId, patientId);

  await db
    .update(memories)
    .set({ name: data.name, summary: data.summary ?? null })
    .where(and(eq(memories.id, memoryId), eq(memories.userId, patientId)));

  await db.insert(caregiverEvents).values({
    caregiverId: userId,
    event: "memory_updated",
    patientId,
    metadata: { memoryId },
  });

  return { success: true };
}

export async function deletePatientMemory(memoryId: string, patientId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await assertOwnsPatient(userId, patientId);

  await db
    .delete(memories)
    .where(and(eq(memories.id, memoryId), eq(memories.userId, patientId)));

  await db.insert(caregiverEvents).values({
    caregiverId: userId,
    event: "memory_deleted",
    patientId,
    metadata: { memoryId },
  });

  return { success: true };
}
