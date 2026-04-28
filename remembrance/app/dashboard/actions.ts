"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { caregiverEvents, patients, users } from "@/db/schema";
import { sql, eq, and, gte, lt, desc, isNotNull, inArray } from "drizzle-orm";

export async function getDashboardStats() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    convsThisWeek,
    convsLastWeek,
    memsThisWeek,
    memsLastWeek,
    activePatientsRows,
    totalPatientsRows,
    recentEvents,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(caregiverEvents)
      .where(
        and(
          eq(caregiverEvents.caregiverId, userId),
          eq(caregiverEvents.event, "conversation_created"),
          gte(caregiverEvents.createdAt, weekAgo),
        ),
      ),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(caregiverEvents)
      .where(
        and(
          eq(caregiverEvents.caregiverId, userId),
          eq(caregiverEvents.event, "conversation_created"),
          gte(caregiverEvents.createdAt, twoWeeksAgo),
          lt(caregiverEvents.createdAt, weekAgo),
        ),
      ),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(caregiverEvents)
      .where(
        and(
          eq(caregiverEvents.caregiverId, userId),
          eq(caregiverEvents.event, "memory_created"),
          gte(caregiverEvents.createdAt, weekAgo),
        ),
      ),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(caregiverEvents)
      .where(
        and(
          eq(caregiverEvents.caregiverId, userId),
          eq(caregiverEvents.event, "memory_created"),
          gte(caregiverEvents.createdAt, twoWeeksAgo),
          lt(caregiverEvents.createdAt, weekAgo),
        ),
      ),
    // Distinct patients with any event this week
    db
      .selectDistinct({ patientId: caregiverEvents.patientId })
      .from(caregiverEvents)
      .where(
        and(
          eq(caregiverEvents.caregiverId, userId),
          isNotNull(caregiverEvents.patientId),
          gte(caregiverEvents.createdAt, weekAgo),
        ),
      ),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(patients)
      .where(eq(patients.caregiverId, userId)),
    // Recent 10 events joined with patient name
    db
      .select({
        id: caregiverEvents.id,
        event: caregiverEvents.event,
        patientId: caregiverEvents.patientId,
        actorId: caregiverEvents.actorId,
        metadata: caregiverEvents.metadata,
        createdAt: caregiverEvents.createdAt,
        patientName: users.name,
      })
      .from(caregiverEvents)
      .leftJoin(users, eq(caregiverEvents.patientId, users.id))
      .where(eq(caregiverEvents.caregiverId, userId))
      .orderBy(desc(caregiverEvents.createdAt))
      .limit(10),
  ]);

  return {
    interactions: {
      thisWeek: convsThisWeek[0]?.count ?? 0,
      delta: (convsThisWeek[0]?.count ?? 0) - (convsLastWeek[0]?.count ?? 0),
    },
    memories: {
      thisWeek: memsThisWeek[0]?.count ?? 0,
      delta: (memsThisWeek[0]?.count ?? 0) - (memsLastWeek[0]?.count ?? 0),
    },
    activePatients: {
      thisWeek: activePatientsRows.length,
      total: totalPatientsRows[0]?.count ?? 0,
    },
    recentActivity: recentEvents,
  };
}

export async function getActivityLog(filters?: {
  patientId?: string;
  eventTypes?: string[];
  limit?: number;
  offset?: number;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const conditions = [eq(caregiverEvents.caregiverId, userId)];
  if (filters?.patientId) conditions.push(eq(caregiverEvents.patientId, filters.patientId));
  if (filters?.eventTypes?.length) conditions.push(inArray(caregiverEvents.event, filters.eventTypes));

  const [events, totalRow] = await Promise.all([
    db
      .select({
        id: caregiverEvents.id,
        event: caregiverEvents.event,
        patientId: caregiverEvents.patientId,
        actorId: caregiverEvents.actorId,
        metadata: caregiverEvents.metadata,
        createdAt: caregiverEvents.createdAt,
        patientName: users.name,
      })
      .from(caregiverEvents)
      .leftJoin(users, eq(caregiverEvents.patientId, users.id))
      .where(and(...conditions))
      .orderBy(desc(caregiverEvents.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(caregiverEvents)
      .where(and(...conditions)),
  ]);

  return { events, total: totalRow[0]?.count ?? 0 };
}
