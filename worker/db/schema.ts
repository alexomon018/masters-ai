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
			.default(sql`(unixepoch() * 1000)`),
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.threadId] }),
		index("threads_user_updated").on(table.userId, table.updatedAt),
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
			.default(sql`(unixepoch() * 1000)`),
	},
	(table) => [primaryKey({ columns: [table.userId, table.projectId] })]
);

export type Thread = typeof threadsTable.$inferSelect;
export type NewThread = typeof threadsTable.$inferInsert;
export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;
