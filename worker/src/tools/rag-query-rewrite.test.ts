import { describe, expect, it, vi } from "vitest";

import {
	isRagQueryRewriteEnabled,
	maybeRewriteRagQuery,
	type GenerateTextFn,
} from "./rag-query-rewrite";

describe("isRagQueryRewriteEnabled", () => {
	it.each([
		["1", true],
		["true", true],
		[true, true],
		["0", false],
		["false", false],
		[undefined, false],
		[false, false],
	])("treats %j as %s", (raw, expected) => {
		expect(isRagQueryRewriteEnabled({ RAG_QUERY_REWRITE: raw })).toBe(expected);
	});
});

function stubGenerateText(text: string): GenerateTextFn {
	return vi.fn<GenerateTextFn>(async () => ({ text }));
}

describe("maybeRewriteRagQuery", () => {
	const enabled = {
		ANTHROPIC_API_KEY: "key",
		RAG_QUERY_REWRITE: "1",
	} as const;

	it("returns the original query when rewrite is disabled", async () => {
		const generateText = stubGenerateText("rewritten");
		const result = await maybeRewriteRagQuery(
			"node streams backpressure",
			{ ANTHROPIC_API_KEY: "key", RAG_QUERY_REWRITE: "0" },
			undefined,
			generateText
		);
		expect(result).toBe("node streams backpressure");
		expect(generateText).not.toHaveBeenCalled();
	});

	it("returns the original query when no API key is present", async () => {
		const generateText = stubGenerateText("rewritten");
		const result = await maybeRewriteRagQuery(
			"node streams backpressure",
			{ ANTHROPIC_API_KEY: "", RAG_QUERY_REWRITE: "1" },
			undefined,
			generateText
		);
		expect(result).toBe("node streams backpressure");
		expect(generateText).not.toHaveBeenCalled();
	});

	it("returns the original query when query and userMessage are both empty", async () => {
		const generateText = stubGenerateText("rewritten");
		const result = await maybeRewriteRagQuery(
			"   ",
			enabled,
			{ userMessage: "  " },
			generateText
		);
		expect(result).toBe("   ");
		expect(generateText).not.toHaveBeenCalled();
	});

	it("returns the rewritten query when enabled", async () => {
		const generateText = stubGenerateText("  Node.js streams backpressure pause resume  ");
		const result = await maybeRewriteRagQuery(
			"backpressure",
			enabled,
			undefined,
			generateText
		);
		expect(result).toBe("Node.js streams backpressure pause resume");
		expect(generateText).toHaveBeenCalledTimes(1);
	});

	it("feeds the user message as source of truth and the draft query as a hint", async () => {
		const generateText = vi.fn<GenerateTextFn>(async () => ({
			text: "rewritten",
		}));
		await maybeRewriteRagQuery(
			"draft query",
			enabled,
			{ userMessage: "how does backpressure work in node?" },
			generateText
		);
		const call = generateText.mock.calls[0]?.[0];
		expect(call?.prompt).toContain("how does backpressure work in node?");
		expect(call?.prompt).toContain("draft query");
	});

	it("falls back to the original query when the rewrite throws", async () => {
		const generateText = vi.fn<GenerateTextFn>(async () => {
			throw new Error("rate limited");
		});
		const result = await maybeRewriteRagQuery(
			"node streams backpressure",
			enabled,
			undefined,
			generateText
		);
		expect(result).toBe("node streams backpressure");
	});

	it("falls back to the original query when the rewrite returns empty text", async () => {
		const generateText = stubGenerateText("   ");
		const result = await maybeRewriteRagQuery(
			"node streams backpressure",
			enabled,
			undefined,
			generateText
		);
		expect(result).toBe("node streams backpressure");
	});
});
