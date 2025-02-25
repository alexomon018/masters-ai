import {
	text,
	timestamp,
	index,
	uuid,
	integer,
	json,
	pgTableCreator
} from "drizzle-orm/pg-core";
import { SuperJSONResult } from "superjson";

export const createPgTable = pgTableCreator((name) => `master_sync_.${name}`);

// Define the projects table (new)
export const projectsTable = createPgTable(
	"projects_table",
	{
		id: integer("id").notNull().primaryKey(),
		userProvidedId: text("user_provided_id").notNull().unique(),
		userId: text("user_id").notNull(),
		name: text("name").notNull(),
		description: text("description"),
		created_at: timestamp("created_at").defaultNow().notNull(),
		updated_at: timestamp("updated_at").defaultNow().notNull()
	},
	(table) => [
		index("projects_user_provided_id_idx").on(table.userProvidedId),
		index("projects_user_id_idx").on(table.userId)
	]
);

export const threadsTable = createPgTable(
	"threads_table",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		title: text("title").notNull(),
		projectId: uuid("project_id").references(() => projectsTable.id),
		userProvidedId: text("user_provided_id").notNull(),
		userId: text("user_id").notNull(),
		created_at: timestamp("created_at").defaultNow().notNull(),
		updated_at: timestamp("updated_at").defaultNow().notNull(),
		last_message_at: timestamp("last_message_at").defaultNow().notNull(),
		data: json().$type<SuperJSONResult>()
	},
	(table) => [
		index("threads_user_provided_id_idx").on(table.userProvidedId),
		index("threads_project_id_idx").on(table.projectId),
		index("threads_user_id_idx").on(table.userId)
	]
);

// Updated messages table
export const messagesTable = createPgTable(
	"messages_table",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userProvidedId: text("user_provided_id").notNull().unique(),
		userId: text("user_id").notNull(),
		threadId: uuid("thread_id")
			.notNull()
			.references(() => threadsTable.id),
		created_at: timestamp("created_at").defaultNow().notNull(),
		data: json().$type<SuperJSONResult>(),
		updated_at: timestamp("updated_at").defaultNow().notNull()
	},
	(table) => [
		index("messages_user_provided_id_idx").on(table.userProvidedId),
		index("messages_user_id_idx").on(table.userId),
		index("messages_thread_id_idx").on(table.threadId)
	]
);

export type Project = {
	id: number;
	userProvidedId: string;
	userId: string;
	name: string;
	description: string | null;
	created_at: Date;
	updated_at: Date;
};

// Thread type
export type Thread = {
	id: string; // UUID
	title: string;
	projectId: string | null; // UUID, optional reference to Project
	userProvidedId: string;
	userId: string;
	created_at: Date;
	updated_at: Date;
	last_message_at: Date;
	data: SuperJSONResult | null;
};

// Message type
export type Message = {
	id: string; // UUID
	userProvidedId: string;
	userId: string;
	threadId: string; // UUID, reference to Thread
	created_at: Date;
	data: SuperJSONResult | null;
	updated_at: Date;
};
