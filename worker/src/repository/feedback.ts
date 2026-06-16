import { and, eq } from "drizzle-orm";
import { schema, type Database } from "../db";
import type { Feedback, NewFeedback } from "../../db/schema";

export interface FeedbackRepo {
	upsert(input: NewFeedback): Promise<void>;
	get(
		userId: string,
		threadId: string,
		messageId: string
	): Promise<Feedback | undefined>;
	listForThread(userId: string, threadId: string): Promise<Feedback[]>;
	delete(userId: string, threadId: string, messageId: string): Promise<void>;
	deleteAllForUser(userId: string): Promise<number>;
}

export function makeFeedbackRepo(db: Database): FeedbackRepo {
	return {
		async upsert(input) {
			await db
				.insert(schema.feedbackTable)
				.values(input)
				.onConflictDoUpdate({
					target: [
						schema.feedbackTable.userId,
						schema.feedbackTable.threadId,
						schema.feedbackTable.messageId
					],
					set: {
						sentiment: input.sentiment,
						reason: input.reason ?? null,
						comment: input.comment ?? null,
						updatedAt: input.updatedAt ?? new Date()
					}
				})
				.run();
		},

		async get(userId, threadId, messageId) {
			return db
				.select()
				.from(schema.feedbackTable)
				.where(
					and(
						eq(schema.feedbackTable.userId, userId),
						eq(schema.feedbackTable.threadId, threadId),
						eq(schema.feedbackTable.messageId, messageId)
					)
				)
				.get();
		},

		async listForThread(userId, threadId) {
			return db
				.select()
				.from(schema.feedbackTable)
				.where(
					and(
						eq(schema.feedbackTable.userId, userId),
						eq(schema.feedbackTable.threadId, threadId)
					)
				)
				.all();
		},

		async delete(userId, threadId, messageId) {
			await db
				.delete(schema.feedbackTable)
				.where(
					and(
						eq(schema.feedbackTable.userId, userId),
						eq(schema.feedbackTable.threadId, threadId),
						eq(schema.feedbackTable.messageId, messageId)
					)
				)
				.run();
		},

		async deleteAllForUser(userId) {
			const result = await db
				.delete(schema.feedbackTable)
				.where(eq(schema.feedbackTable.userId, userId))
				.run();
			return Number(
				(result as { meta?: { changes?: number } }).meta?.changes ?? 0
			);
		}
	};
}
