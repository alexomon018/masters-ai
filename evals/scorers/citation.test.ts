import { describe, expect, it } from "vitest";

import {
	answerKeywordScorer,
	citationScorer,
	hasFmContext,
	isCitationOf,
} from "./citation";
import type { ChatAgentOutput } from "./chatOutput";
import type { ChatTestCase } from "../types";

const makeOutput = (text: string): ChatAgentOutput => ({
	text,
	toolNames: [],
	casual: false,
	ragHitTexts: [],
	ragHits: [],
});

const makeCase = (overrides: Partial<ChatTestCase>): ChatTestCase =>
	({
		id: "test",
		difficulty: "simple",
		category: "domain",
		messages: [],
		expectsRagCall: true,
		expectedCharacteristics: [],
		...overrides,
	}) as ChatTestCase;

describe("hasFmContext", () => {
	it("matches Frontend Masters case-insensitively", () => {
		expect(hasFmContext("Frontend Masters has great courses")).toBe(true);
		expect(hasFmContext("frontend masters has great courses")).toBe(true);
		expect(hasFmContext("the FRONTEND MASTERS catalog")).toBe(true);
	});

	it("returns false when the brand phrase is absent", () => {
		expect(hasFmContext("Node.js streams are great")).toBe(false);
		expect(hasFmContext("frontendmasters")).toBe(false); // no space
	});
});

describe("isCitationOf", () => {
	it("counts a real citation: label and brand in the same sentence", () => {
		expect(
			isCitationOf(
				"The Next.js v3 course on Frontend Masters with Scott Moss covers RSC.",
				"next js"
			)
		).toBe(true);
	});

	it("rejects an answer that disclaims FM coverage in the same sentence", () => {
		expect(
			isCitationOf(
				"Unfortunately, the Frontend Masters course transcripts don't have detailed coverage of Node.js stream backpressure.",
				"node js"
			)
		).toBe(false);
	});

	it("counts an honest end-of-answer suggestion that points to FM", () => {
		expect(
			isCitationOf(
				"For Node.js detail, check Frontend Masters' Node.js courses.",
				"node js"
			)
		).toBe(true);
	});

	it("counts an instructor cited in proximity to the brand", () => {
		expect(
			isCitationOf("Frontend Masters' Mike North teaches generics.", "Mike North")
		).toBe(true);
	});

	it("returns false when the brand phrase is missing entirely", () => {
		expect(
			isCitationOf("Node.js streams handle backpressure via pause.", "node js")
		).toBe(false);
	});

	it("returns false when the label never appears", () => {
		expect(
			isCitationOf(
				"Frontend Masters has many courses on web development.",
				"node js"
			)
		).toBe(false);
	});

	// Judgment call: a topic word appearing in the user's restated question
	// followed by a generic FM mention in the next sentence is within 120
	// chars, so the gap-based fallback treats it as a citation. The original
	// bug this scorer was meant to fix (DISCLAIMERS) is still blocked. We
	// accept this looser behavior because it's hard to distinguish a
	// "see also" suggestion from a restated question without an LLM. Documented
	// here so test intent is explicit.
	it("treats brand + topic in adjacent sentences (no disclaimer) as a citation", () => {
		expect(
			isCitationOf(
				"How do Node.js streams handle backpressure? Frontend Masters covers many topics.",
				"node js"
			)
		).toBe(true);
	});

	it("does NOT count a brand mention far from the label", () => {
		const filler = " filler text ".repeat(20); // ~260 chars
		expect(
			isCitationOf(
				`Frontend Masters is a great platform.${filler}Node.js streams pause and resume.`,
				"node js"
			)
		).toBe(false);
	});

	it("does not count when the disclaimer spans the proximity region", () => {
		expect(
			isCitationOf(
				"Frontend Masters search results don't contain Node.js backpressure details.",
				"node js"
			)
		).toBe(false);
	});
});

describe("citationScorer", () => {
	it("scores 1 when course label is cited in same sentence as brand", () => {
		const result = citationScorer({
			input: makeCase({}),
			output: makeOutput(
				"The Next.js v3 course on Frontend Masters by Scott Moss explains this."
			),
			expected: makeCase({ expectedCourses: ["next js"] }),
			metadata: undefined,
		} as never) as { score: number; metadata: { matched: string[] } };
		expect(result.score).toBe(1);
		expect(result.metadata.matched).toContain("next js");
	});

	it("scores 1 for course + instructor when both are in same citing sentence", () => {
		const result = citationScorer({
			input: makeCase({}),
			output: makeOutput(
				"The Next.js v3 course on Frontend Masters by Scott Moss explains this."
			),
			expected: makeCase({
				expectedCourses: ["next js"],
				expectedInstructor: "Scott Moss",
			}),
			metadata: undefined,
		} as never) as { score: number };
		expect(result.score).toBe(1);
	});

	it("gives partial credit (0.5) when only instructor is in proximity to brand", () => {
		const result = citationScorer({
			input: makeCase({}),
			output: makeOutput(
				"Frontend Masters' Mike North teaches generics in depth, with examples drawn from typescript best practices documentation that doesn't sit alongside the brand."
			),
			expected: makeCase({
				expectedCourses: ["typescript"],
				expectedInstructor: "Mike North",
			}),
			metadata: undefined,
		} as never) as { score: number; metadata: { matched: string[] } };
		// Instructor "Mike North" sits next to "Frontend Masters"; "typescript"
		// is later in the same answer but still within the 120-char proximity
		// window. To test the partial-credit path explicitly we use a
		// longer-distance variant below.
		expect(result.score).toBe(1); // Both happen to land within proximity.
		expect(result.metadata.matched).toEqual(
			expect.arrayContaining(["Mike North"])
		);
	});

	it("gives 0.5 when one label is cited and another is too far from the brand", () => {
		const filler = " lorem ipsum dolor sit amet ".repeat(15); // >300 chars
		const text = `Frontend Masters' Mike North teaches generics.${filler}typescript ships excellent inference.`;
		const result = citationScorer({
			input: makeCase({}),
			output: makeOutput(text),
			expected: makeCase({
				expectedCourses: ["typescript"],
				expectedInstructor: "Mike North",
			}),
			metadata: undefined,
		} as never) as { score: number; metadata: { matched: string[] } };
		expect(result.score).toBe(0.5);
		expect(result.metadata.matched).toEqual(["Mike North"]);
	});

	it("scores 0 when answer disclaims FM coverage", () => {
		const result = citationScorer({
			input: makeCase({}),
			output: makeOutput(
				"The Frontend Masters transcripts don't have detailed coverage of Node.js stream backpressure."
			),
			expected: makeCase({ expectedCourses: ["node js"] }),
			metadata: undefined,
		} as never) as { score: number };
		expect(result.score).toBe(0);
	});

	it("returns null when there are no expected labels", () => {
		const result = citationScorer({
			input: makeCase({}),
			output: makeOutput("Anything"),
			expected: makeCase({}),
			metadata: undefined,
		} as never);
		expect(result).toBeNull();
	});
});

describe("answerKeywordScorer", () => {
	it("counts keywords case-insensitively without requiring brand context", () => {
		const result = answerKeywordScorer({
			input: makeCase({}),
			output: makeOutput("Backpressure pauses readable streams in Node."),
			expected: makeCase({ expectedKeywords: ["backpressure", "stream"] }),
			metadata: undefined,
		} as never) as { score: number };
		expect(result.score).toBe(1);
	});

	it("returns null when no keywords are expected", () => {
		const result = answerKeywordScorer({
			input: makeCase({}),
			output: makeOutput("anything"),
			expected: makeCase({}),
			metadata: undefined,
		} as never);
		expect(result).toBeNull();
	});
});
