import { describe, expect, it, vi } from "vitest";

vi.mock("./braintrust", () => ({
	generateText: vi.fn(async () => ({ text: "React Server Components" }))
}));

vi.mock("@ai-sdk/anthropic", () => ({
	anthropic: { languageModel: vi.fn(() => "model-stub") }
}));

import { runLLM, sanitizeTitle } from "./llm";
import { generateText } from "./braintrust";

describe("sanitizeTitle", () => {
	it("strips markdown emphasis and backticks", () => {
		expect(sanitizeTitle("**React** `Hooks`")).toBe("React Hooks");
	});

	it("strips surrounding quotes", () => {
		expect(sanitizeTitle('"CSS Grid Layout"')).toBe("CSS Grid Layout");
		expect(sanitizeTitle("'Redux Setup'")).toBe("Redux Setup");
	});

	it("strips << >> and <TOKEN> conversation markers", () => {
		expect(sanitizeTitle("<<END>>React Query<HUMAN>")).toBe("React Query");
	});

	it("collapses whitespace and newlines", () => {
		expect(sanitizeTitle("React\n\n  Server   Components")).toBe(
			"React Server Components"
		);
	});

	it("clamps long titles to ~40 chars with an ellipsis", () => {
		const long =
			"A Very Long Title That Exceeds The Forty Character Sidebar Budget";
		const out = sanitizeTitle(long);
		expect(out.length).toBeLessThanOrEqual(40);
		expect(out.endsWith("…")).toBe(true);
	});

	it("falls back to New Chat for empty / whitespace-only input", () => {
		expect(sanitizeTitle("")).toBe("New Chat");
		expect(sanitizeTitle("   ")).toBe("New Chat");
		expect(sanitizeTitle("**``**")).toBe("New Chat");
	});
});

describe("runLLM", () => {
	it("returns the sanitized model output", async () => {
		const title = await runLLM([{ role: "user", content: "What is RSC?" }]);
		expect(title).toBe("React Server Components");
		expect(generateText).toHaveBeenCalledOnce();
	});

	it("bundles the exchange into a single user turn", async () => {
		await runLLM([
			{ role: "user", content: "Q" },
			{ role: "assistant", content: "A" }
		]);
		const call = vi.mocked(generateText).mock.calls.at(-1)?.[0] as {
			messages: { role: string; content: string }[];
		};
		expect(call.messages).toHaveLength(1);
		expect(call.messages[0].role).toBe("user");
		expect(call.messages[0].content).toContain("User: Q");
		expect(call.messages[0].content).toContain("Assistant: A");
	});
});
