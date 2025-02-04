import { pgTable, text, timestamp, index, uuid } from "drizzle-orm/pg-core";

// Define the projects table (new)
export const projects = pgTable(
	"projects",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		description: text("description"),
		userId: text("user_id"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(table) => [index("projects_user_id_idx").on(table.userId)]
);

// Updated chats table (renamed to threads for consistency)
export const threads = pgTable(
	"threads",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		title: text("title").notNull(),
		projectId: uuid("project_id").references(() => projects.id),
		userId: text("user_id"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		lastMessageAt: timestamp("last_message_at").defaultNow().notNull()
	},
	(table) => [
		index("threads_user_id_idx").on(table.userId),
		index("threads_project_id_idx").on(table.projectId)
	]
);

// Updated messages table
export const messages = pgTable(
	"messages",
	{
		id: uuid("id").primaryKey().defaultRandom(), // Changed from serial to uuid
		threadId: uuid("thread_id") // Renamed from chatId
			.notNull()
			.references(() => threads.id),
		content: text("content").notNull(),
		role: text("role").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(table) => [index("thread_id_idx").on(table.threadId)]
);
