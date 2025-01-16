import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
	pgTable,
	serial,
	text,
	integer,
	timestamp,
	index
} from "drizzle-orm/pg-core";

if (!process.env.POSTGRES_URL) {
	throw new Error("POSTGRES_URL environment variable is not set");
}

const postgres = neon(process.env.POSTGRES_URL);
export const db = drizzle(postgres);

// Define the chats table
export const chats = pgTable(
	"chats",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(table) => [index("user_id_idx").on(table.userId)]
);

// Define the messages table
export const messages = pgTable(
	"messages",
	{
		id: serial("id").primaryKey(),
		chatId: integer("chat_id")
			.references(() => chats.id)
			.notNull(),
		content: text("content").notNull(),
		role: text("role").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(table) => [index("chat_id_idx").on(table.chatId)]
);
