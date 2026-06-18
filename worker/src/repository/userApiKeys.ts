import { and, eq } from "drizzle-orm";
import { schema, type Database } from "../db";
import type { LLMProvider } from "../providers";
import type { NewUserApiKey, UserApiKey } from "../../db/schema";

export interface UserApiKeyRepo {
	listForUser(userId: string): Promise<UserApiKey[]>;
	get(userId: string, provider: LLMProvider): Promise<UserApiKey | undefined>;
	upsert(input: NewUserApiKey): Promise<void>;
	delete(userId: string, provider: LLMProvider): Promise<void>;
	deleteAllForUser(userId: string): Promise<number>;
}

export function makeUserApiKeyRepo(db: Database): UserApiKeyRepo {
	return {
		async listForUser(userId) {
			return db
				.select()
				.from(schema.userApiKeysTable)
				.where(eq(schema.userApiKeysTable.userId, userId))
				.all();
		},

		async get(userId, provider) {
			return db
				.select()
				.from(schema.userApiKeysTable)
				.where(
					and(
						eq(schema.userApiKeysTable.userId, userId),
						eq(schema.userApiKeysTable.provider, provider)
					)
				)
				.get();
		},

		async upsert(input) {
			await db
				.insert(schema.userApiKeysTable)
				.values(input)
				.onConflictDoUpdate({
					target: [
						schema.userApiKeysTable.userId,
						schema.userApiKeysTable.provider
					],
					set: {
						ciphertext: input.ciphertext,
						iv: input.iv,
						lastFour: input.lastFour,
						updatedAt: input.updatedAt ?? new Date()
					}
				})
				.run();
		},

		async delete(userId, provider) {
			await db
				.delete(schema.userApiKeysTable)
				.where(
					and(
						eq(schema.userApiKeysTable.userId, userId),
						eq(schema.userApiKeysTable.provider, provider)
					)
				)
				.run();
		},

		async deleteAllForUser(userId) {
			const result = await db
				.delete(schema.userApiKeysTable)
				.where(eq(schema.userApiKeysTable.userId, userId))
				.run();
			return Number(
				(result as { meta?: { changes?: number } }).meta?.changes ?? 0
			);
		}
	};
}
