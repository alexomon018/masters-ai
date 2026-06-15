import { describe, expect, it } from "vitest";

import { abstentionScorer } from "./abstention";
import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";

const edgeCase: ChatTestCase = {
	id: "gold-chat-out-of-scope",
	difficulty: "edge",
	category: "edge",
	messages: [{ role: "user", content: "Explain lattice gauge theory." }],
	expectsRagCall: true,
	expectedCharacteristics: [],
};

const baseOutput: ChatAgentOutput = {
	text: "",
	toolNames: ["ragSearch"],
	casual: false,
	ragHitTexts: [],
	ragHits: [],
};

const run = (text: string, overrides: Partial<ChatAgentOutput> = {}) =>
	abstentionScorer({
		input: edgeCase,
		output: { ...baseOutput, text, ...overrides },
		expected: edgeCase,
	} as never);

describe("abstentionScorer", () => {
	it("returns null for non-edge cases", () => {
		const result = abstentionScorer({
			input: { ...edgeCase, category: "domain" },
			output: { ...baseOutput, text: "anything" },
			expected: { ...edgeCase, category: "domain" },
		} as never);
		expect(result).toBeNull();
	});

	it("skips grading when retrieval actually returned hits", () => {
		const result = run("Frontend Masters covers this in depth.", {
			ragHits: [{ courseName: "Node.js", teacherName: "Will", text: "x" }],
		});
		expect(result).toBeNull();
	});

	it("scores 1 when the answer abstains and does not fabricate FM coverage", () => {
		const result = run(
			"Frontend Masters does not cover lattice gauge theory. In general, it is a way to study quantum chromodynamics on a discrete grid."
		);
		expect(result).not.toBeNull();
		expect((result as { score: number }).score).toBe(1);
	});

	it("scores 0 when the answer fabricates Frontend Masters coverage", () => {
		const result = run(
			"Frontend Masters has a great course on lattice gauge theory that walks through the basics."
		);
		expect((result as { score: number }).score).toBe(0);
	});

	it("scores 0 when the answer never abstains", () => {
		const result = run(
			"Lattice gauge theory is a lattice regularization of gauge theories used in physics."
		);
		expect((result as { score: number }).score).toBe(0);
	});

	it("returns null when ragSearch was never called", () => {
		const result = run("Frontend Masters does not cover this.", {
			toolNames: [],
		});
		expect(result).toBeNull();
	});
});
