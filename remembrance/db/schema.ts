import {
  pgTable,
  text,
  timestamp,
  varchar,
  uuid,
  boolean,
  jsonb,
  integer,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";

// --- ENUMS ---
// Defines the primary account types in the system
export const userRoleEnum = pgEnum("user_role", [
  "caregiver",
  "patient",
  "individual",
]);

// --- USERS TABLE ---
// Synced with Clerk via Webhooks. When a user is deleted in Clerk,
// cascading deletes will remove all their associated data here.
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(), // Clerk User ID (e.g. user_2...)
  role: userRoleEnum("role").notNull().default("individual"),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- PATIENTS / PROFILES TABLE ---
// Stores HIPAA-compliant (if secured properly) patient profiles.
// Caregivers can manage multiple patients by linking to `caregiverId`.
export const patients = pgTable("patients", {
  id: varchar("id", { length: 255 }).primaryKey(), // Clerk User ID (e.g. user_2...)
  // The actual user account of the patient
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // The caregiver who manages this patient
  caregiverId: varchar("caregiver_id", { length: 255 }).references(
    () => users.id,
    { onDelete: "set null" },
  ),

  // Profile Data matching `app/hooks/useProfile.ts`
  patientName: varchar("patient_name", { length: 255 }),
  age: integer("age"),
  family: jsonb("family").$type<{ name: string; relation: string }[]>(),
  places: jsonb("places").$type<string[]>(),
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- CONVERSATIONS TABLE ---
// Groups messages into distinct chat sessions
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

// --- MESSAGES TABLE ---
// Stores the actual 1M+ token chat messages natively leveraging Postgres TOAST
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // The oversized content storage
  text: text("text").notNull(),
  sentByUser: boolean("sent_by_user").notNull().default(true),
  status: varchar("status", { length: 50 }),
  thinkingText: text("thinking_text"),
  requestId: varchar("request_id", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- TOPICS TABLE ---
// Hierarchical categorization for memories
export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: uuid("parent_id"), // Self-referential for nested topics (handled via application logic)
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- MEMORIES TABLE ---
// Stores structured memories extracted from conversations
export const memories = pgTable("memories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  summary: text("summary"),
  content: jsonb("content"), // Flexible structured content storage
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- MEMORY TOPICS (MANY-TO-MANY) ---
// Links memories to multiple topics
export const memoryTopics = pgTable(
  "memory_topics",
  {
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.memoryId, t.topicId] }),
  }),
);

// --- CAREGIVER NOTES ---
// Notes that caregivers write about their patients, synced to patient's Mem0 memory
export const caregiverNotes = pgTable("caregiver_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  caregiverId: varchar("caregiver_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  patientId: varchar("patient_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- NOTIFICATIONS ---
// In-app notifications for memory saves and caregiver note events
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'memory_saved' | 'note_added'
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  read: boolean("read").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
