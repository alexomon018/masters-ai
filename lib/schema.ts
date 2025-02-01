import {
	pgTable,
	serial,
	text,
	timestamp,
	index,
	uuid,
	foreignKey
} from "drizzle-orm/pg-core";

// Define the chats table
export const chats = pgTable(
	"chats",
	{
		id: uuid("id").primaryKey().defaultRandom(),
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
		chatId: uuid("chat_id")
			.notNull()
			.references(() => chats.id),
		content: text("content").notNull(),
		role: text("role").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(table) => [index("chat_id_idx").on(table.chatId)]
);
