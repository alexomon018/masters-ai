import { describe, expect, it, vi } from "vitest";
import type { ModelMessage } from "ai";
import { runMemoryExtraction } from "./manager";
import type { GenerateObjectFn } from "./extractor";
import type { MemoryRepo, PromoteOutcome } from "../repository/memory";
import type { Env } from "../env";

const messages: ModelMessage[] = [
	{ role: "user", content: "I'm building a Next.js app and prefer terse answers" },
	{ role: "assistant", content: "Got it." }
];

function fakeRepo(outcomes: PromoteOutcome[]): MemoryRepo {
	let i = 0;
	return {
		listActive: vi.fn(async () => []),
		listVisible: vi.fn(async () => []),
		promote: vi.fn(async () => outcomes[i++] ?? { outcome: "rejected", reason: "x" }),
		deleteOne: vi.fn(async () => true),
		deleteAllForUser: vi.fn(async () => 0)
	};
}

const enabledEnv = {
	ANTHROPIC_API_KEY: "k",
	OPENAI_API_KEY: "k",
	THREAD_INDEX: {} as D1Database
} as Env;

describe("runMemoryExtraction", () => {
	it("no-ops when extraction is disabled", async () => {
		const repo = fakeRepo([]);
		const summary = await runMemoryExtraction(
			{ ...enabledEnv, MEMORY_EXTRACTION: "0" } as Env,
			{ userId: "user:a", threadId: "t1", messages, repo }
		);
		expect(summary.candidates).toBe(0);
		expect(repo.promote).not.toHaveBeenCalled();
	});

	it("runs each extracted candidate through the repo and tallies outcomes", async () => {
		const stub: GenerateObjectFn = async () => ({
			object: {
				candidates: [
					{ type: "fact", content: "Is building a Next.js app", confidence: 0.9 },
					{ type: "preference", key: "verbosity", content: "terse", confidence: 0.95 }
				]
			}
		});
		const repo = fakeRepo([
			{ outcome: "written", memoryId: "1", status: "active" },
			{ outcome: "deduplicated", memoryId: "2" }
		]);
		const summary = await runMemoryExtraction(enabledEnv, {
			userId: "user:a",
			threadId: "t1",
			messages,
			repo,
			generateObjectFn: stub
		});
		expect(summary).toMatchObject({
			candidates: 2,
			written: 1,
			deduplicated: 1
		});
		expect(repo.promote).toHaveBeenCalledTimes(2);
	});
});
