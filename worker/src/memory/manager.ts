// The memory manager's write path: take a finished turn, extract candidates,
// and run each through the promotion gate + repository. Returns the per-
// candidate outcomes so the caller can record them in a trace.

import type { ModelMessage } from "ai";
import { getDb } from "../db";
import { makeMemoryRepo, type MemoryRepo, type PromoteOutcome } from "../repository/memory";
import type { Env } from "../env";
import {
	buildExtractionTranscript,
	extractMemoryCandidates,
	isMemoryExtractionEnabled,
	type GenerateObjectFn
} from "./extractor";

export interface RunMemoryExtractionArgs {
	userId: string;
	threadId: string;
	messages: ModelMessage[];
	repo?: MemoryRepo;
	generateObjectFn?: GenerateObjectFn;
}

export interface MemoryExtractionSummary {
	candidates: number;
	written: number;
	confirmed: number;
	deduplicated: number;
	rejected: number;
	outcomes: PromoteOutcome[];
}

// Factory rather than a shared constant: each caller gets its own outcomes
// array and counters, so an early-return summary can never be aliased/mutated
// across extraction runs.
function emptySummary(): MemoryExtractionSummary {
	return {
		candidates: 0,
		written: 0,
		confirmed: 0,
		deduplicated: 0,
		rejected: 0,
		outcomes: []
	};
}

export async function runMemoryExtraction(
	env: Env,
	{ userId, threadId, messages, repo, generateObjectFn }: RunMemoryExtractionArgs
): Promise<MemoryExtractionSummary> {
	if (!isMemoryExtractionEnabled(env)) return emptySummary();
	if (!env.THREAD_INDEX) return emptySummary();

	const transcript = buildExtractionTranscript(messages);
	if (!transcript) return emptySummary();

	const candidates = await extractMemoryCandidates(
		env,
		transcript,
		threadId,
		generateObjectFn
	);
	if (candidates.length === 0) return emptySummary();

	const memoryRepo = repo ?? makeMemoryRepo(getDb(env));
	const outcomes: PromoteOutcome[] = [];
	for (const candidate of candidates) {
		// Sequential within a run for readable outcomes; the cross-run / cross-DO
		// invariant (no duplicate live rows for the same user+content) is enforced
		// at the repository boundary via the partial unique index in promote(),
		// not by this ordering.
		// eslint-disable-next-line no-await-in-loop
		outcomes.push(await memoryRepo.promote(userId, candidate));
	}

	const summary: MemoryExtractionSummary = {
		candidates: candidates.length,
		written: outcomes.filter((o) => o.outcome === "written").length,
		confirmed: outcomes.filter((o) => o.outcome === "confirmed").length,
		deduplicated: outcomes.filter((o) => o.outcome === "deduplicated").length,
		rejected: outcomes.filter((o) => o.outcome === "rejected").length,
		outcomes
	};
	return summary;
}
