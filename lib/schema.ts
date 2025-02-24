import {
	pgTable,
	text,
	timestamp,
	index,
	uuid,
	integer,
	json
} from "drizzle-orm/pg-core";

// Define the projects table (new)
export const projects = pgTable(
	"projects",
	{
		id: integer("id").notNull().primaryKey(),
		userProviderId: text("user_provider_id").notNull().unique(),
		userId: text("user_id").notNull(),
		name: text("name").notNull(),
		description: text("description"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(table) => [
		index("projects_user_provider_id_idx").on(table.userProviderId),
		index("projects_user_id_idx").on(table.userId)
	]
);

// Updated chats table (renamed to threads for consistency)
export const threads = pgTable(
	"threads",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		title: text("title").notNull(),
		projectId: uuid("project_id").references(() => projects.id),
		userProviderId: text("user_provider_id").notNull(),
		userId: text("user_id").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		lastMessageAt: timestamp("last_message_at").defaultNow().notNull()
	},
	(table) => [
		index("threads_user_provider_id_idx").on(table.userProviderId),
		index("threads_project_id_idx").on(table.projectId),
		index("threads_user_id_idx").on(table.userId)
	]
);

// Updated messages table
export const messages = pgTable(
	"messages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userProviderId: text("user_provider_id").notNull(),
		userId: text("user_id").notNull(),
		threadId: uuid("thread_id")
			.notNull()
			.references(() => threads.id),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		data: json()
	},
	(table) => [
		index("messages_user_provider_id_idx").on(table.userProviderId),
		index("messages_user_id_idx").on(table.userId),
		index("messages_thread_id_idx").on(table.threadId)
	]
);
