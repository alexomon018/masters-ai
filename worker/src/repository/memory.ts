import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { schema, type Database } from "../db";
import { evaluateCandidate, type AcceptedCandidate } from "../memory/promotion-gate";
import { tryCatch } from "../../../utils/tryCatch";
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

	// The single live (active/provisional) row for a (user, content) pair, if
	// any. Backed by the partial unique index, so there is at most one.
	async function findLiveMatch(
		userId: string,
		contentHash: string
	): Promise<UserMemory | undefined> {
		const rows = await db
			.select()
			.from(schema.userMemoryTable)
			.where(
				and(
					eq(schema.userMemoryTable.userId, userId),
					eq(schema.userMemoryTable.contentHash, contentHash),
					inArray(schema.userMemoryTable.status, [...VISIBLE_STATUSES])
				)
			)
			.all();
		return rows[0];
	}

	// The single live (active/provisional) row for a (user, preference key) pair,
	// if any. Backed by the partial unique index on (userId, memoryKey), so there
	// is at most one. Used to resolve a unique-key race the same way contentHash
	// conflicts are resolved.
	async function findLiveByKey(
		userId: string,
		memoryKey: string
	): Promise<UserMemory | undefined> {
		const rows = await db
			.select()
			.from(schema.userMemoryTable)
			.where(
				and(
					eq(schema.userMemoryTable.userId, userId),
					eq(schema.userMemoryTable.memoryKey, memoryKey),
					inArray(schema.userMemoryTable.status, [...VISIBLE_STATUSES])
				)
			)
			.all();
		return rows[0];
	}

	// Resolve a duplicate against an existing live row. A provisional fact is
	// promoted to active only on *corroboration* — a new observation from a
	// different thread, or a strictly stronger confidence. A same-thread repeat
	// at equal-or-lower confidence is just a dedup and stays provisional, so a
	// model can't self-confirm its own earlier inference within one conversation.
	async function resolveLiveMatch(
		userId: string,
		liveMatch: UserMemory,
		gated: AcceptedCandidate
	): Promise<PromoteOutcome> {
		const now = new Date();
		const gatedConfidence = toStoredConfidence(gated.confidence);
		const independent =
			!!gated.sourceThreadId &&
			gated.sourceThreadId !== liveMatch.sourceThreadId;
		const stronger = gatedConfidence > liveMatch.confidence;

		if (liveMatch.status === "provisional" && (independent || stronger)) {
			await db
				.update(schema.userMemoryTable)
				.set({
					status: "active",
					confidence: Math.max(liveMatch.confidence, gatedConfidence),
					// Inherit the confirming observation's provenance — a
					// user_stated/admin_set confirmation must upgrade an originally
					// inferred row's source, not leave it reporting "inferred".
					source: gated.source,
					// Record the confirming observation's provenance, not the
					// original — it's the stronger/independent evidence.
					sourceThreadId: gated.sourceThreadId ?? liveMatch.sourceThreadId,
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

			const liveMatch = await findLiveMatch(userId, gated.contentHash);
			if (liveMatch) return resolveLiveMatch(userId, liveMatch, gated);

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
			const inserted = await tryCatch(
				db.insert(schema.userMemoryTable).values(row).run()
			);
			if (inserted.success) {
				return { outcome: "written", memoryId, status: gated.status };
			}
			// A partial unique index rejected the insert — a concurrent promote
			// (e.g. from another Durable Object) won the race. Resolve against the
			// row that now exists instead of surfacing the conflict.
			//
			// Two indexes can fire: the (user, contentHash) dedup index, when the
			// same value was promoted twice; or the (user, key) index, when a
			// different value for the same preference key landed first. Check both.
			const raced = await findLiveMatch(userId, gated.contentHash);
			if (raced) return resolveLiveMatch(userId, raced, gated);
			if (gated.key) {
				const racedKey = await findLiveByKey(userId, gated.key);
				if (racedKey) return resolveLiveMatch(userId, racedKey, gated);
			}
			// No conflicting live row exists, so the failure was a real error.
			throw inserted.error;
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
