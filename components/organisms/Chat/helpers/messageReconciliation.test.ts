import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
	endsWithSplitAssistant,
	shouldApplyServerMessages,
	totalTextLength
} from "./messageReconciliation";

const userMsg = (id: string, text: string): UIMessage =>
	({ id, role: "user", parts: [{ type: "text", text }] }) as UIMessage;
const assistantMsg = (id: string, text: string): UIMessage =>
	({ id, role: "assistant", parts: [{ type: "text", text }] }) as UIMessage;

describe("endsWithSplitAssistant", () => {
	it("is false for an empty list", () => {
		expect(endsWithSplitAssistant([])).toBe(false);
	});

	it("is false for a single assistant message", () => {
		expect(endsWithSplitAssistant([assistantMsg("a1", "hi")])).toBe(false);
	});

	it("is false for a normal user → assistant turn", () => {
		expect(
			endsWithSplitAssistant([userMsg("u1", "q"), assistantMsg("a1", "r")])
		).toBe(false);
	});

	it("is true when the turn ends with two assistant messages", () => {
		expect(
			endsWithSplitAssistant([
				userMsg("u1", "q"),
				assistantMsg("a1", "first half"),
				assistantMsg("a2", "second half")
			])
		).toBe(true);
	});

	it("is false when an assistant message is followed by a user message", () => {
		expect(
			endsWithSplitAssistant([
				assistantMsg("a1", "r"),
				userMsg("u1", "follow-up")
			])
		).toBe(false);
	});
});

describe("totalTextLength", () => {
	it("sums the text of all text parts across messages", () => {
		expect(
			totalTextLength([userMsg("u1", "12345"), assistantMsg("a1", "123")])
		).toBe(8);
	});

	it("ignores non-text parts and messages without parts", () => {
		const withToolPart = {
			id: "a1",
			role: "assistant",
			parts: [
				{ type: "tool-ragSearch", toolCallId: "t1", state: "output-available" },
				{ type: "text", text: "ab" }
			]
		} as unknown as UIMessage;
		const withoutParts = { id: "a2", role: "assistant" } as UIMessage;
		expect(totalTextLength([withToolPart, withoutParts])).toBe(2);
	});
});

describe("shouldApplyServerMessages", () => {
	const client = [
		userMsg("u1", "q"),
		assistantMsg("a1", "first"),
		assistantMsg("a2", "second")
	];

	it("rejects an empty server list", () => {
		expect(shouldApplyServerMessages([], client)).toBe(false);
	});

	it("rejects a server list with less text than the client view", () => {
		const server = [userMsg("u1", "q"), assistantMsg("a1", "first")];
		expect(shouldApplyServerMessages(server, client)).toBe(false);
	});

	it("accepts a server list with at least as much text", () => {
		const server = [userMsg("u1", "q"), assistantMsg("a1", "firstsecond")];
		expect(shouldApplyServerMessages(server, client)).toBe(true);
	});

	it("accepts a longer server list (recovered chunks the client missed)", () => {
		const server = [
			userMsg("u1", "q"),
			assistantMsg("a1", "firstmiddlesecond")
		];
		expect(shouldApplyServerMessages(server, client)).toBe(true);
	});

	it("accepts a longer server history for a truncated (non-split) turn", () => {
		const truncatedClient = [userMsg("u1", "q"), assistantMsg("a1", "first")];
		const server = [userMsg("u1", "q"), assistantMsg("a1", "first second")];
		expect(shouldApplyServerMessages(server, truncatedClient)).toBe(true);
	});

	it("rejects an equal-text server history for a normal (non-split) turn", () => {
		const normalClient = [userMsg("u1", "q"), assistantMsg("a1", "answer")];
		const server = [userMsg("u1", "q"), assistantMsg("a1", "answer")];
		expect(shouldApplyServerMessages(server, normalClient)).toBe(false);
	});
});
