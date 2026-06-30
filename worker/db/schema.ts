// D1 (SQLite) schema for the per-user thread index. Defines metadata only —
// the messages themselves live inside each MastersChatAgent DO's SQLite,
// addressed by thread_id.
//
// user_id is a logical identifier with one of two shapes:
//   "user:<clerkId>"   — authenticated Clerk user
//   "anon:<cookieId>"  — anonymous visitor identified by a long-lived cookie
//
// On sign-in the browser calls POST /threads/claim-anon to re-key anon rows.

import { sql } from "drizzle-orm";
import {
	sqliteTable,
	text,
	integer,
	primaryKey,
	index,
	check
} from "drizzle-orm/sqlite-core";

export const threadsTable = sqliteTable(
	"threads",
	{
		userId: text("user_id").notNull(),
		threadId: text("thread_id").notNull(),
		title: text("title"),
		projectId: text("project_id"),
		pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
		lastMessageAt: integer("last_message_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`)
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.threadId] }),
		index("threads_user_updated").on(table.userId, table.updatedAt)
	]
);

export const projectsTable = sqliteTable(
	"projects",
	{
		userId: text("user_id").notNull(),
		projectId: text("project_id").notNull(),
		name: text("name").notNull(),
		description: text("description"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`)
	},
	(table) => [primaryKey({ columns: [table.userId, table.projectId] })]
);

// Catalog of (instructor, course) pairs, backfilled from Upstash Vector
// metadata. Powers exact instructor->courses lookups, which dense vector
// search cannot enumerate reliably. Not per-user.
export const coursesTable = sqliteTable(
	"courses",
	{
		instructor: text("instructor").notNull(),
		courseName: text("course_name").notNull(),
		courseTitle: text("course_title").notNull().default(""),
		releasedAt: text("released_at").notNull().default("")
	},
	(table) => [
		primaryKey({ columns: [table.instructor, table.courseName] }),
		index("courses_instructor").on(table.instructor)
	]
);

// Per-message feedback (thumbs up/down). messageId is the UIMessage id from the
// DO history, stable across reloads. Composite PK means one vote per user per
// message; switching sentiment is an upsert, clearing it is a delete.
export const feedbackTable = sqliteTable(
	"feedback",
	{
		userId: text("user_id").notNull(),
		threadId: text("thread_id").notNull(),
		messageId: text("message_id").notNull(),
		sentiment: text("sentiment", { enum: ["up", "down"] }).notNull(),
		reason: text("reason"),
		comment: text("comment"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`)
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.threadId, table.messageId] }),
		index("feedback_user_thread").on(table.userId, table.threadId),
		check("feedback_sentiment", sql`${table.sentiment} IN ('up', 'down')`)
	]
);

// Per-user, typed long-term memory — the durable layer that turns per-thread
// retrieval into cross-session continuity. Distinct from the global transcript
// vector store (shared knowledge) and the DO message history (per-thread
// trace): rows here are facts/preferences/episodes ABOUT a user, scoped by
// user_id and reused on every turn.
//
//   type        — "preference" (exact key/value personalization),
//                 "fact" (durable assertion about the user/their work),
//                 "episode" (summary of a past session).
//   status      — computed server-side by the promotion gate, never trusted
//                 from a caller. "provisional" rows are stored but withheld
//                 from prompt injection until confirmed (status -> "active").
//   content_hash — SHA-256 of (type|key|normalized content), the dedup key
//                 within a user scope so the same assertion seen twice
//                 collapses to one row instead of competing in retrieval.
//   superseded_by — points at the replacement row when a preference/fact is
//                 contradicted, so retrieval sees either old or new, never both.
export const userMemoryTable = sqliteTable(
	"user_memory",
	{
		userId: text("user_id").notNull(),
		memoryId: text("memory_id").notNull(),
		type: text("type", {
			enum: ["preference", "fact", "episode"]
		}).notNull(),
		memoryKey: text("memory_key"),
		content: text("content").notNull(),
		contentHash: text("content_hash").notNull(),
		source: text("source", {
			enum: ["user_stated", "inferred", "admin_set"]
		})
			.notNull()
			.default("inferred"),
		confidence: integer("confidence").notNull().default(100),
		status: text("status", {
			enum: ["active", "provisional", "revoked", "superseded"]
		})
			.notNull()
			.default("active"),
		supersededBy: text("superseded_by"),
		sourceThreadId: text("source_thread_id"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`)
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.memoryId] }),
		index("user_memory_scope").on(table.userId, table.type, table.status),
		index("user_memory_dedup").on(table.userId, table.contentHash),
		check(
			"user_memory_type",
			sql`${table.type} IN ('preference', 'fact', 'episode')`
		),
		check(
			"user_memory_status",
			sql`${table.status} IN ('active', 'provisional', 'revoked', 'superseded')`
		)
	]
);

// Per-user BYOK provider keys. The key is encrypted at rest (AES-GCM via
// worker/src/crypto/keyVault.ts); only ciphertext + iv are stored, plus the
// last four chars for display. Composite PK means one key per user per provider.
export const userApiKeysTable = sqliteTable(
	"user_api_keys",
	{
		userId: text("user_id").notNull(),
		provider: text("provider", { enum: ["anthropic", "openai"] }).notNull(),
		ciphertext: text("ciphertext").notNull(),
		iv: text("iv").notNull(),
		lastFour: text("last_four").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`)
	},
	(table) => [primaryKey({ columns: [table.userId, table.provider] })]
);

export type Thread = typeof threadsTable.$inferSelect;
export type NewThread = typeof threadsTable.$inferInsert;
export type Feedback = typeof feedbackTable.$inferSelect;
export type NewFeedback = typeof feedbackTable.$inferInsert;
export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;
export type Course = typeof coursesTable.$inferSelect;
export type NewCourse = typeof coursesTable.$inferInsert;
export type UserApiKey = typeof userApiKeysTable.$inferSelect;
export type NewUserApiKey = typeof userApiKeysTable.$inferInsert;
export type UserMemory = typeof userMemoryTable.$inferSelect;
export type NewUserMemory = typeof userMemoryTable.$inferInsert;
