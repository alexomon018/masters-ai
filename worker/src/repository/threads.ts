import { and, desc, eq } from "drizzle-orm";
import { schema, type Database } from "../db";
import type { NewThread, Thread } from "../../db/schema";

export interface ThreadRepo {
	listForUser(userId: string): Promise<Thread[]>;
	get(userId: string, threadId: string): Promise<Thread | undefined>;
	upsert(input: NewThread): Promise<void>;
	delete(userId: string, threadId: string): Promise<void>;
	deleteAllForUser(userId: string): Promise<number>;
	reassignUser(fromUserId: string, toUserId: string): Promise<number>;
}

export function makeThreadRepo(db: Database): ThreadRepo {
	return {
		async listForUser(userId) {
			return db
				.select()
				.from(schema.threadsTable)
				.where(eq(schema.threadsTable.userId, userId))
				.orderBy(desc(schema.threadsTable.updatedAt))
				.all();
		},

		async get(userId, threadId) {
			return db
				.select()
				.from(schema.threadsTable)
				.where(
					and(
						eq(schema.threadsTable.userId, userId),
						eq(schema.threadsTable.threadId, threadId)
					)
				)
				.get();
		},

		async upsert(input) {
			await db
				.insert(schema.threadsTable)
				.values(input)
				.onConflictDoUpdate({
					target: [
						schema.threadsTable.userId,
						schema.threadsTable.threadId,
					],
					set: {
						title: input.title,
						projectId: input.projectId,
						pinned: input.pinned,
						updatedAt: input.updatedAt ?? new Date(),
						lastMessageAt: input.lastMessageAt ?? new Date(),
					},
				})
				.run();
		},

		async delete(userId, threadId) {
			await db
				.delete(schema.threadsTable)
				.where(
					and(
						eq(schema.threadsTable.userId, userId),
						eq(schema.threadsTable.threadId, threadId)
					)
				)
				.run();
		},

		async deleteAllForUser(userId) {
			const result = await db
				.delete(schema.threadsTable)
				.where(eq(schema.threadsTable.userId, userId))
				.run();
			return Number((result as { meta?: { changes?: number } }).meta?.changes ?? 0);
		},

		async reassignUser(fromUserId, toUserId) {
			const result = await db
				.update(schema.threadsTable)
				.set({ userId: toUserId, updatedAt: new Date() })
				.where(eq(schema.threadsTable.userId, fromUserId))
				.run();
			return Number((result as { meta?: { changes?: number } }).meta?.changes ?? 0);
		},
	};
}
