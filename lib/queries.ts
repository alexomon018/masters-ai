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
				data: sql`excluded.data`,
				updated_at: sql`CURRENT_TIMESTAMP`
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
		threadId: thread.id,
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
				data: sql`excluded.data`,
				updated_at: sql`CURRENT_TIMESTAMP`
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
	const threadIds = userThreads.map((thread) => {
		const parsedData = SuperJSON.deserialize(thread.data!) as Thread;
		return parsedData.id;
	});

	// Get all messages for these threads in a single query
	const allMessages =
		threadIds.length > 0
			? await db
					.select()
					.from(messagesTable)
					.where(eq(messagesTable.userId, userId))
					.orderBy(messagesTable.created_at)
			: [];

	// Filter messages by threadId from the data field
	const filteredMessages = allMessages.filter((message) => {
		if (!message.data) return false;
		// Parse the data field using SuperJSON and cast it to the Message type
		const parsedData = SuperJSON.deserialize(message.data) as Message;
		return parsedData?.threadId && threadIds.includes(parsedData.threadId);
	});

	return {
		threads: userThreads,
		messages: filteredMessages
	};
}

export async function deleteThreadFromDb(threadId: string) {
	// Delete all messages for this thread in a single query
	const deletedMessages = await db
		.delete(messagesTable)
		.where(eq(messagesTable.threadId, threadId))
		.returning();

	const deletedMessagesCount = deletedMessages.length;

	// Delete the thread directly using the threadId column
	const deletedThreads = await db
		.delete(threadsTable)
		.where(eq(threadsTable.threadId, threadId))
		.returning();

	const deletedThreadsCount = deletedThreads.length;

	return {
		deletedMessagesCount,
		deletedThreadsCount
	};
}
