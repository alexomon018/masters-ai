import { describe, expect, it } from "vitest";
import type { ModelMessage } from "ai";
import {
	buildAgentCallOptions,
	isCasualMessage,
	isContextFollowupMessage,
} from "./agent-core";

const userMsg = (text: string): ModelMessage[] => [
	{ role: "user", content: text }
];

describe("isCasualMessage", () => {
	it.each([
		["ok", true],
		["hey there!", true],
		["thanks!", true],
		["hi", true],
		["who are you?", true],
		["thanks, that helps a lot", false],
		["ok different question - explain TypeScript generics", false],
		["How do React Server Components work?", false],
		["", false]
	])("classifies %j as casual=%s", (text, expected) => {
		expect(isCasualMessage(userMsg(text))).toBe(expected);
	});

	it("returns false when there is no message", () => {
		expect(isCasualMessage([])).toBe(false);
	});

	it("returns false when last message is not from the user", () => {
		expect(
			isCasualMessage([{ role: "assistant", content: "hi" }])
		).toBe(false);
	});

	it("handles array (multipart) user content", () => {
		const messages: ModelMessage[] = [
			{
				role: "user",
				content: [{ type: "text", text: "thanks!" }]
			}
		];
		expect(isCasualMessage(messages)).toBe(true);
	});

	it("does not classify multipart content with substantive text as casual", () => {
		const messages: ModelMessage[] = [
			{
				role: "user",
				content: [
					{
						type: "text",
						text: "ok different question - explain TypeScript generics"
					}
				]
			}
		];
		expect(isCasualMessage(messages)).toBe(false);
	});
});

describe("isContextFollowupMessage", () => {
	const followup = (text: string): ModelMessage[] => [
		{ role: "user", content: "Explain TypeScript generics." },
		{ role: "assistant", content: "Generics let you write reusable types." },
		{ role: "user", content: text },
	];

	it.each([
		["can you say that more simply?", true],
		["cool, that makes sense - appreciate it", true],
		["wait, who are you exactly?", true],
		["explain that again differently", true],
		["how does it differ from client components?", false],
		["focus on just the backpressure part", false],
		["tell me more about transform streams", false],
	])("classifies %j as context follow-up=%s", (text, expected) => {
		expect(isContextFollowupMessage(followup(text))).toBe(expected);
	});

	it("returns false without a prior assistant turn", () => {
		expect(
			isContextFollowupMessage([
				{ role: "user", content: "can you say that more simply?" },
			])
		).toBe(false);
	});
});

describe("buildAgentCallOptions", () => {
	it("forces a tool call on the first step for weak models", () => {
		const options = buildAgentCallOptions({
			model: {} as never,
			modelLabel: "gpt-5.4-mini",
			messages: userMsg("Explain TypeScript generics"),
			env: {
				UPSTASH_VECTOR_REST_URL: "https://vector.test",
				UPSTASH_VECTOR_REST_TOKEN: "token",
			},
		});

		expect(options.prepareStep?.({ stepNumber: 0 })).toEqual({
			toolChoice: "required",
		});
		expect(options.prepareStep?.({ stepNumber: 1 })).toBeUndefined();
	});

	it("does not force a tool on a rephrase follow-up turn", () => {
		const messages: ModelMessage[] = [
			{ role: "user", content: "Explain TypeScript generics." },
			{ role: "assistant", content: "Generics let you write reusable types." },
			{ role: "user", content: "can you say that more simply?" },
		];
		const options = buildAgentCallOptions({
			model: {} as never,
			modelLabel: "gpt-5.4-mini",
			messages,
			env: {
				UPSTASH_VECTOR_REST_URL: "https://vector.test",
				UPSTASH_VECTOR_REST_TOKEN: "token",
			},
		});

		expect(options.prepareStep?.({ stepNumber: 0 })).toBeUndefined();
		// Tools stay available so the model may still search if it chooses to.
		expect(options.activeTools).toBeUndefined();
	});

	it("still forces a tool on a substantive follow-up turn", () => {
		const messages: ModelMessage[] = [
			{ role: "user", content: "What are React Server Components?" },
			{ role: "assistant", content: "They render on the server." },
			{ role: "user", content: "how does it differ from client components?" },
		];
		const options = buildAgentCallOptions({
			model: {} as never,
			modelLabel: "gpt-5.4-mini",
			messages,
			env: {
				UPSTASH_VECTOR_REST_URL: "https://vector.test",
				UPSTASH_VECTOR_REST_TOKEN: "token",
			},
		});

		expect(options.prepareStep?.({ stepNumber: 0 })).toEqual({
			toolChoice: "required",
		});
	});

	it("disables tools on casual turns", () => {
		const options = buildAgentCallOptions({
			model: {} as never,
			modelLabel: "claude-haiku-4-5",
			messages: userMsg("thanks!"),
			env: {
				UPSTASH_VECTOR_REST_URL: "https://vector.test",
				UPSTASH_VECTOR_REST_TOKEN: "token",
			},
			casual: isCasualMessage(userMsg("thanks!")),
		});

		expect(options.activeTools).toEqual([]);
		expect(options.prepareStep?.({ stepNumber: 0 })).toBeUndefined();
	});
});
