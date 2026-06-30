import { describe, expect, it, vi } from "vitest";
import type { LanguageModel, ModelMessage } from "ai";
import { compactHistory, type CompactGenerateTextFn } from "./compaction";

const model = {} as LanguageModel;

function msgs(count: number, len: number): ModelMessage[] {
	return Array.from({ length: count }, (_, i) => ({
		role: i % 2 === 0 ? "user" : "assistant",
		content: `m${i}:${"x".repeat(len)}`
	}));
}

describe("compactHistory", () => {
	it("returns history unchanged below the threshold and keeps the prior summary", async () => {
		const gen = vi.fn();
		const prior = { coveredCount: 2, text: "old summary" };
		const result = await compactHistory(msgs(4, 10), {
			model,
			threshold: 100_000,
			priorSummary: prior,
			generateTextFn: gen as unknown as CompactGenerateTextFn
		});
		expect(result.messages).toHaveLength(4);
		expect(result.summary).toBe(prior);
		expect(gen).not.toHaveBeenCalled();
	});

	it("summarizes older messages and keeps the last N when over threshold", async () => {
		const gen = vi.fn(async () => ({ text: "fresh summary" }));
		const messages = msgs(10, 2000); // ~20k chars, over default 32k? ensure
		const result = await compactHistory(messages, {
			model,
			threshold: 1000,
			keepLast: 4,
			generateTextFn: gen
		});
		expect(gen).toHaveBeenCalledTimes(1);
		// One system summary + last 4 verbatim.
		expect(result.messages).toHaveLength(5);
		expect(result.messages[0].role).toBe("system");
		expect(result.summary).toEqual({ coveredCount: 6, text: "fresh summary" });
	});

	it("extends a reusable prior summary instead of recomputing from scratch", async () => {
		const gen = vi.fn(async () => ({ text: "extended summary" }));
		const messages = msgs(10, 2000);
		const result = await compactHistory(messages, {
			model,
			threshold: 1000,
			keepLast: 4,
			priorSummary: { coveredCount: 4, text: "prior" },
			generateTextFn: gen
		});
		expect(gen).toHaveBeenCalledTimes(1);
		const promptArg = gen.mock.calls[0][0].prompt;
		expect(promptArg).toContain("Existing summary");
		expect(promptArg).toContain("prior");
		expect(result.summary?.coveredCount).toBe(6);
	});

	it("reuses the prior summary verbatim when nothing new fell out of the window", async () => {
		const gen = vi.fn();
		const messages = msgs(10, 2000);
		const result = await compactHistory(messages, {
			model,
			threshold: 1000,
			keepLast: 4,
			priorSummary: { coveredCount: 6, text: "already covers it" },
			generateTextFn: gen as unknown as CompactGenerateTextFn
		});
		expect(gen).not.toHaveBeenCalled();
		expect(result.summary).toEqual({
			coveredCount: 6,
			text: "already covers it"
		});
	});

	it("recomputes when a stale prior covers more than remains", async () => {
		const gen = vi.fn(async () => ({ text: "recomputed" }));
		const messages = msgs(10, 2000);
		const result = await compactHistory(messages, {
			model,
			threshold: 1000,
			keepLast: 4,
			priorSummary: { coveredCount: 99, text: "stale" },
			generateTextFn: gen
		});
		expect(gen).toHaveBeenCalledTimes(1);
		const promptArg = gen.mock.calls[0][0].prompt;
		expect(promptArg).toContain("Summarize this conversation");
		expect(result.summary?.coveredCount).toBe(6);
	});
});
