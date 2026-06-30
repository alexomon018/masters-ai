import { describe, expect, it, vi } from "vitest";
import type { ModelMessage } from "ai";
import {
	buildExtractionTranscript,
	extractMemoryCandidates,
	isMemoryExtractionEnabled,
	type GenerateObjectFn
} from "./extractor";
import type { Env } from "../env";

const fakeEnv = {
	ANTHROPIC_API_KEY: "test-key",
	OPENAI_API_KEY: "test-key"
} as Env;

describe("isMemoryExtractionEnabled", () => {
	it("is off without an Anthropic key", () => {
		expect(isMemoryExtractionEnabled({ ANTHROPIC_API_KEY: "" })).toBe(false);
	});

	it("defaults on with a key", () => {
		expect(isMemoryExtractionEnabled({ ANTHROPIC_API_KEY: "k" })).toBe(true);
	});

	it("can be disabled with 0/false", () => {
		expect(
			isMemoryExtractionEnabled({ ANTHROPIC_API_KEY: "k", MEMORY_EXTRACTION: "0" })
		).toBe(false);
		expect(
			isMemoryExtractionEnabled({
				ANTHROPIC_API_KEY: "k",
				MEMORY_EXTRACTION: "false"
			})
		).toBe(false);
	});
});

describe("buildExtractionTranscript", () => {
	it("keeps only user/assistant text and labels roles", () => {
		const messages: ModelMessage[] = [
			{ role: "system", content: "system prompt" },
			{ role: "user", content: "I am building a Next.js app" },
			{ role: "assistant", content: "Great, here is some help" }
		];
		const transcript = buildExtractionTranscript(messages);
		expect(transcript).toContain("User: I am building a Next.js app");
		expect(transcript).toContain("Assistant: Great, here is some help");
		expect(transcript).not.toContain("system prompt");
	});
});

describe("extractMemoryCandidates", () => {
	it("returns empty for an empty transcript without calling the model", async () => {
		const fn = vi.fn();
		const result = await extractMemoryCandidates(
			fakeEnv,
			"   ",
			"t1",
			fn as unknown as GenerateObjectFn
		);
		expect(result).toEqual([]);
		expect(fn).not.toHaveBeenCalled();
	});

	it("maps model candidates into MemoryCandidates with provenance", async () => {
		const stub: GenerateObjectFn = async () => ({
			object: {
				candidates: [
					{ type: "preference", key: "verbosity", content: "terse", confidence: 0.95 },
					{ type: "fact", content: "Is learning React", confidence: 0.8 }
				]
			}
		});
		const result = await extractMemoryCandidates(
			fakeEnv,
			"User: be terse. I'm learning React",
			"thread-7",
			stub
		);
		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			type: "preference",
			key: "verbosity",
			content: "terse",
			source: "inferred",
			sourceThreadId: "thread-7"
		});
		expect(result[1].sourceThreadId).toBe("thread-7");
	});

	it("returns empty on model failure instead of throwing", async () => {
		const stub: GenerateObjectFn = async () => {
			throw new Error("model down");
		};
		const result = await extractMemoryCandidates(
			fakeEnv,
			"User: hi",
			"t1",
			stub
		);
		expect(result).toEqual([]);
	});
});
