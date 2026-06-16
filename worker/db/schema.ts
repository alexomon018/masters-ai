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

export type Thread = typeof threadsTable.$inferSelect;
export type NewThread = typeof threadsTable.$inferInsert;
export type Feedback = typeof feedbackTable.$inferSelect;
export type NewFeedback = typeof feedbackTable.$inferInsert;
export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;
export type Course = typeof coursesTable.$inferSelect;
export type NewCourse = typeof coursesTable.$inferInsert;
