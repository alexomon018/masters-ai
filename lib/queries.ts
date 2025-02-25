import { eq, sql } from "drizzle-orm";
import SuperJSON from "superjson";
import { messagesTable, threadsTable } from "./schema";
import db from "./db";
import type { Message, Thread } from "./schema";

/**
 * Syncs messages from local IndexedDB to the server database
 */

export async function syncMessagesToDb(input: {
	userId: string;
	messages: Message[];
}) {
	if (input.messages.length === 0) {
		return;
	}

	const messagesToInsert = input.messages.map((message) => ({
		userId: input.userId,
		userProvidedId: `${input.userId}_${message.id}`,
		threadId: message.threadId,
		createdAt: message.created_at,
		data: SuperJSON.serialize(message)
	}));

	await db
		.insert(messagesTable)
		.values(messagesToInsert)
		.onConflictDoUpdate({
			target: messagesTable.userProvidedId,
			set: {
				data: sql`VALUES(${messagesTable.data})`,
				updated_at: sql`VALUES(${messagesTable.updated_at})`
			}
		});
}

/**
 * Syncs threads from local IndexedDB to the server database
 */
export async function syncThreadsToDb(input: {
	userId: string;
	threads: Thread[];
}) {
	if (input.threads.length === 0) {
		return;
	}

	const threadsToInsert = input.threads.map((thread) => ({
		userId: input.userId,
		userProvidedId: `${input.userId}_${thread.id}`,
		title: thread.title,
		projectId: thread.projectId,
		createdAt: thread.created_at,
		updatedAt: thread.updated_at,
		lastMessageAt: thread.last_message_at,
		data: SuperJSON.serialize(thread)
	}));

	await db
		.insert(threadsTable)
		.values(threadsToInsert)
		.onConflictDoUpdate({
			target: threadsTable.userProvidedId,
			set: {
				data: sql`VALUES(${threadsTable.data})`,
				updated_at: sql`VALUES(${threadsTable.updated_at})`
			}
		});
}

/**
 * Gets all threads for a user
 */
export async function getAllThreads(userId: string) {
	return db
		.select()
		.from(threadsTable)
		.where(eq(threadsTable.userId, userId))
		.orderBy(threadsTable.last_message_at);
}

export async function getAllThreadsAndMessagesFromDb(userId: string) {
	const userThreads = await getAllThreads(userId);

	// Get all thread IDs
	const threadIds = userThreads.map((thread) => thread.id);

	// Get all messages for these threads in a single query
	const allMessages =
		threadIds.length > 0
			? await db
					.select()
					.from(messagesTable)
					.where(sql`${messagesTable.threadId} IN ${threadIds}`)
					.orderBy(messagesTable.created_at)
			: [];

	return {
		threads: userThreads,
		messages: allMessages
	};
}
