import { DEX_Message, DEX_Thread } from "@/localdb/dexie";
import { and, eq, gte, sql, SQL } from "drizzle-orm";
import SuperJSON from "superjson";
import { messages, threads } from "./schema";
import { REAL_DB } from ".";

/**
 * Syncs messages from local IndexedDB to the server database
 */
export async function syncMessagesToDb(input: {
	userId: string;
	messages: DEX_Message[];
}) {
	if (input.messages.length === 0) {
		return;
	}

	const messagesToInsert = input.messages.map((message) => ({
		userId: input.userId,
		userProviderId: `${input.userId}_${message.id}`,
		data: SuperJSON.serialize(message)
	}));

	await REAL_DB.insert(messages)
		.values(messagesToInsert)
		.onDuplicateKeyUpdate({
			set: {
				data: sql`VALUES(${messages.data})`,
				updatedAt: sql`VALUES(${messages.updatedAt})`
			}
		});
}

/**
 * Syncs threads from local IndexedDB to the server database
 */
export async function syncThreadsToDB(input: {
	userId: string;
	threads: DEX_Thread[];
}) {
	if (input.threads.length === 0) {
		return;
	}

	const threadsToInsert = input.threads.map((thread) => ({
		userId: input.userId,
		userProviderId: `${input.userId}_${thread.id}`,
		title: thread.title,
		projectId: thread.projectId,
		createdAt: thread.created_at,
		updatedAt: thread.updated_at,
		lastMessageAt: thread.last_message_at
	}));

	await REAL_DB.insert(threads)
		.values(threadsToInsert)
		.onDuplicateKeyUpdate({
			set: {
				title: sql`VALUES(${threads.title})`,
				updatedAt: sql`VALUES(${threads.updatedAt})`,
				lastMessageAt: sql`VALUES(${threads.lastMessageAt})`
			}
		});
}

/**
 * Fetches messages from the server database that are newer than the provided timestamp
 */
export async function fetchNewMessages(input: {
	userId: string;
	since?: Date;
}) {
	const query = REAL_DB.select()
		.from(messages)
		.where(eq(messages.userId, input.userId));

	if (input.since) {
		query.where(gte(messages.updatedAt, input.since));
	}

	return await query;
}

/**
 * Fetches threads from the server database that are newer than the provided timestamp
 */
export async function fetchNewThreads(input: { userId: string; since?: Date }) {
	const query = REAL_DB.select()
		.from(threads)
		.where(eq(threads.userId, input.userId));

	if (input.since) {
		query.where(gte(threads.updatedAt, input.since));
	}

	return await query;
}

/**
 * Syncs data between local IndexedDB and server database
 */
export async function syncData(input: {
	userId: string;
	localMessages: DEX_Message[];
	localThreads: DEX_Thread[];
	lastSyncTimestamp?: Date;
}) {
	// First, push local data to server
	await Promise.all([
		syncMessagesToDb({
			userId: input.userId,
			messages: input.localMessages
		}),
		syncThreadsToDB({
			userId: input.userId,
			threads: input.localThreads
		})
	]);

	// Then, fetch new data from server
	const [newMessages, newThreads] = await Promise.all([
		fetchNewMessages({
			userId: input.userId,
			since: input.lastSyncTimestamp
		}),
		fetchNewThreads({
			userId: input.userId,
			since: input.lastSyncTimestamp
		})
	]);

	return {
		messages: newMessages,
		threads: newThreads,
		syncTimestamp: new Date()
	};
}
