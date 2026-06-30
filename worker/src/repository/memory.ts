import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { schema, type Database } from "../db";
import { evaluateCandidate } from "../memory/promotion-gate";
import type { MemoryCandidate } from "../memory/types";
import type { NewUserMemory, UserMemory } from "../../db/schema";

// Confidence is a 0..1 float on the API and an integer 0..100 in the column.
const toStoredConfidence = (c: number): number => Math.round(c * 100);
const fromStoredConfidence = (c: number): number => c / 100;

const VISIBLE_STATUSES = ["active", "provisional"] as const;

export interface MemoryView {
	memoryId: string;
	type: UserMemory["type"];
	key: string | null;
	content: string;
	source: UserMemory["source"];
	confidence: number;
	status: UserMemory["status"];
	sourceThreadId: string | null;
	createdAt: number;
	updatedAt: number;
}

// Outcome of a single promotion attempt — the article's promotion-gate
// vocabulary (written / deduplicated / confirmed / superseded / rejected) so a
// trace can record exactly why each candidate did or didn't land.
export type PromoteOutcome =
	| { outcome: "written"; memoryId: string; status: "active" | "provisional" }
	| { outcome: "deduplicated"; memoryId: string }
	| { outcome: "confirmed"; memoryId: string }
	| { outcome: "rejected"; reason: string };

export interface MemoryRepo {
	// Exact, exhaustive lookup of injectable memory for a user — the article's
	// "known-scope" retrieval path. No ranking, no top-k; runs every turn.
	listActive(userId: string): Promise<MemoryView[]>;
	// Active + provisional, for the user-facing transparency view.
	listVisible(userId: string): Promise<MemoryView[]>;
	// Run a candidate through the promotion gate and persist the decision.
	promote(userId: string, candidate: MemoryCandidate): Promise<PromoteOutcome>;
	deleteOne(userId: string, memoryId: string): Promise<boolean>;
	deleteAllForUser(userId: string): Promise<number>;
}

function toView(row: UserMemory): MemoryView {
	return {
		memoryId: row.memoryId,
		type: row.type,
		key: row.memoryKey,
		content: row.content,
		source: row.source,
		confidence: fromStoredConfidence(row.confidence),
		status: row.status,
		sourceThreadId: row.sourceThreadId,
		createdAt: row.createdAt.getTime(),
		updatedAt: row.updatedAt.getTime()
	};
}

export function makeMemoryRepo(db: Database): MemoryRepo {
	async function listByStatuses(
		userId: string,
		statuses: readonly UserMemory["status"][]
	): Promise<MemoryView[]> {
		const rows = await db
			.select()
			.from(schema.userMemoryTable)
			.where(
				and(
					eq(schema.userMemoryTable.userId, userId),
					inArray(schema.userMemoryTable.status, [...statuses])
				)
			)
			.orderBy(
				schema.userMemoryTable.type,
				desc(schema.userMemoryTable.updatedAt)
			)
			.all();
		return rows.map(toView);
	}

	return {
		async listActive(userId) {
			return listByStatuses(userId, ["active"]);
		},

		async listVisible(userId) {
			return listByStatuses(userId, VISIBLE_STATUSES);
		},

		async promote(userId, candidate) {
			const gated = await evaluateCandidate(candidate);
			if (gated.outcome === "rejected") {
				return { outcome: "rejected", reason: gated.reason };
			}

			// Dedup by (userId, contentHash) across still-live rows. The same
			// assertion arriving twice must collapse to one row, never compete in
			// retrieval as duplicates.
			const existing = await db
				.select()
				.from(schema.userMemoryTable)
				.where(
					and(
						eq(schema.userMemoryTable.userId, userId),
						eq(schema.userMemoryTable.contentHash, gated.contentHash),
						inArray(schema.userMemoryTable.status, [...VISIBLE_STATUSES])
					)
				)
				.all();

			const liveMatch = existing[0];
			if (liveMatch) {
				const now = new Date();
				// A second observation of a provisional fact is the confirmation
				// signal that promotes it to active (and thus injectable).
				if (
					liveMatch.status === "provisional" &&
					(gated.status === "active" || gated.status === "provisional")
				) {
					await db
						.update(schema.userMemoryTable)
						.set({
							status: "active",
							confidence: Math.max(
								liveMatch.confidence,
								toStoredConfidence(gated.confidence)
							),
							sourceThreadId:
								gated.sourceThreadId ?? liveMatch.sourceThreadId,
							updatedAt: now
						})
						.where(
							and(
								eq(schema.userMemoryTable.userId, userId),
								eq(schema.userMemoryTable.memoryId, liveMatch.memoryId)
							)
						)
						.run();
					return { outcome: "confirmed", memoryId: liveMatch.memoryId };
				}

				await db
					.update(schema.userMemoryTable)
					.set({ updatedAt: now })
					.where(
						and(
							eq(schema.userMemoryTable.userId, userId),
							eq(schema.userMemoryTable.memoryId, liveMatch.memoryId)
						)
					)
					.run();
				return { outcome: "deduplicated", memoryId: liveMatch.memoryId };
			}

			const memoryId = crypto.randomUUID();
			const now = new Date();

			// A preference is single-valued per key: a new value for an existing
			// key supersedes the old row (kept for audit, hidden from retrieval)
			// so the model never sees two conflicting values for the same setting.
			if (gated.type === "preference" && gated.key) {
				await db
					.update(schema.userMemoryTable)
					.set({ status: "superseded", supersededBy: memoryId, updatedAt: now })
					.where(
						and(
							eq(schema.userMemoryTable.userId, userId),
							eq(schema.userMemoryTable.type, "preference"),
							eq(schema.userMemoryTable.memoryKey, gated.key),
							inArray(schema.userMemoryTable.status, [...VISIBLE_STATUSES]),
							ne(schema.userMemoryTable.contentHash, gated.contentHash)
						)
					)
					.run();
			}

			const row: NewUserMemory = {
				userId,
				memoryId,
				type: gated.type,
				memoryKey: gated.key,
				content: gated.content,
				contentHash: gated.contentHash,
				source: gated.source,
				confidence: toStoredConfidence(gated.confidence),
				status: gated.status,
				supersededBy: null,
				sourceThreadId: gated.sourceThreadId,
				createdAt: now,
				updatedAt: now
			};
			await db.insert(schema.userMemoryTable).values(row).run();
			return { outcome: "written", memoryId, status: gated.status };
		},

		async deleteOne(userId, memoryId) {
			const result: D1Result = await db
				.delete(schema.userMemoryTable)
				.where(
					and(
						eq(schema.userMemoryTable.userId, userId),
						eq(schema.userMemoryTable.memoryId, memoryId)
					)
				)
				.run();
			return (result.meta.changes ?? 0) > 0;
		},

		async deleteAllForUser(userId) {
			const result: D1Result = await db
				.delete(schema.userMemoryTable)
				.where(eq(schema.userMemoryTable.userId, userId))
				.run();
			return result.meta.changes ?? 0;
		}
	};
}
