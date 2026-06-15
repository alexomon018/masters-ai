import { describe, expect, it } from "vitest";

import {
	extractCitedLabels,
	citationGroundingScorer,
} from "./citationGrounding";
import type { ChatAgentOutput } from "./chatOutput";
import type { ChatTestCase } from "../types";

const makeOutput = (overrides: Partial<ChatAgentOutput>): ChatAgentOutput => ({
	text: "",
	toolNames: ["ragSearch"],
	casual: false,
	ragHitTexts: [],
	ragHits: [],
	...overrides,
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

describe("extractCitedLabels", () => {
	it("returns labels cited with Frontend Masters attribution", () => {
		const cited = extractCitedLabels(
			"The Next.js course on Frontend Masters by Scott Moss covers RSC.",
			["next js", "Scott Moss", "python"]
		);
		expect(cited).toEqual(expect.arrayContaining(["next js", "Scott Moss"]));
	});
});

describe("citationGroundingScorer", () => {
	it("scores 1 when cited labels appear in rag hits", () => {
		const result = citationGroundingScorer({
			input: makeCase({}),
			output: makeOutput({
				text: "Frontend Masters' Next.js course by Scott Moss explains server components.",
				ragHits: [
					{
						courseName: "Next.js",
						teacherName: "Scott Moss",
						text: "Server components render on the server.",
					},
				],
				ragHitTexts: ["Server components render on the server."],
			}),
			expected: makeCase({ expectedCourses: ["next js"] }),
			metadata: undefined,
		} as never) as { score: number };

		expect(result.score).toBe(1);
	});

	it("penalizes fabricated citations not present in rag hits", () => {
		const result = citationGroundingScorer({
			input: makeCase({}),
			output: makeOutput({
				text: "Frontend Masters' Kubernetes course by Jane Doe explains pods.",
				ragHits: [
					{
						courseName: "Next.js",
						teacherName: "Scott Moss",
						text: "Server components render on the server.",
					},
				],
			}),
			expected: makeCase({ expectedCourses: ["kubernetes"] }),
			metadata: undefined,
		} as never) as { score: number; metadata: { fabricated: string[] } };

		expect(result.score).toBe(0);
		expect(result.metadata.fabricated.length).toBeGreaterThan(0);
	});
});
