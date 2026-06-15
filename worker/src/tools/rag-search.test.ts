import { describe, expect, it } from "vitest";

import {
	filterResultsByScore,
	formatRagHits,
	rerankHits,
	topHitIsRelevant,
	type RagHit,
} from "./rag-search";

const makeHit = (over: Partial<RagHit>): RagHit => ({
	courseName: "Course",
	fileName: "f",
	teacherName: "Teacher",
	timestamp: "",
	score: 0.8,
	text: "",
	...over,
});

describe("filterResultsByScore", () => {
	it("uses the primary threshold when strong matches exist", () => {
		const results = filterResultsByScore([
			{ score: 0.82, metadata: { courseName: "a", fileName: "1", timestamp: "", teacherName: "A" }, data: "x" },
			{ score: 0.55, metadata: { courseName: "b", fileName: "2", timestamp: "", teacherName: "B" }, data: "y" },
		]);
		expect(results).toHaveLength(1);
		expect(results[0]?.score).toBe(0.82);
	});

	it("falls back to lower-scoring hits when nothing clears the primary threshold", () => {
		const results = filterResultsByScore([
			{ score: 0.62, metadata: { courseName: "a", fileName: "1", timestamp: "", teacherName: "A" }, data: "x" },
			{ score: 0.58, metadata: { courseName: "b", fileName: "2", timestamp: "", teacherName: "B" }, data: "y" },
			{ score: 0.41, metadata: { courseName: "c", fileName: "3", timestamp: "", teacherName: "C" }, data: "z" },
		]);
		expect(results).toHaveLength(2);
		expect(results[0]?.score).toBe(0.62);
	});
});

describe("rerankHits", () => {
	it("promotes chunks with better keyword overlap", () => {
		const hits: RagHit[] = [
			{
				courseName: "CSS Grid",
				fileName: "a",
				teacherName: "Jen",
				timestamp: "1:00",
				score: 0.8,
				text: "Grid template areas help with layout.",
			},
			{
				courseName: "CSS Foundations",
				fileName: "b",
				teacherName: "Jen",
				timestamp: "2:00",
				score: 0.79,
				text: "Flexbox aligns items along one axis.",
			},
		];

		const reranked = rerankHits("CSS flexbox align items", hits);
		expect(reranked[0]?.courseName).toBe("CSS Foundations");
	});

	it("can promote a lower-cosine hit whose course title matches the query", () => {
		const hits: RagHit[] = [
			{
				courseName: "Complete React",
				fileName: "a",
				teacherName: "Brian",
				timestamp: "1:00",
				score: 0.82,
				text: "Components and hooks in modern apps.",
			},
			{
				courseName: "CSS Grid",
				fileName: "b",
				teacherName: "Jen",
				timestamp: "2:00",
				score: 0.78,
				text: "Define columns and rows for your layout.",
			},
		];

		const reranked = rerankHits("CSS Grid layout columns rows", hits);
		expect(reranked[0]?.courseName).toBe("CSS Grid");
	});

	it("down-weights a common title token so a rare one wins (IDF)", () => {
		// "grid" is common across the pool, "node" is rare. With equal cosine and
		// text overlap, the rare-token course should rank first.
		const hits: RagHit[] = [
			makeHit({ courseName: "Grid CSS", score: 0.8, text: "x" }),
			makeHit({ courseName: "Node", score: 0.8, text: "x" }),
			makeHit({ courseName: "Grid Foundations", score: 0.4, text: "x" }),
			makeHit({ courseName: "Grid Advanced", score: 0.4, text: "x" }),
			makeHit({ courseName: "Grid Basics", score: 0.4, text: "x" }),
		];

		const reranked = rerankHits("node grid", hits);
		expect(reranked[0]?.courseName).toBe("Node");
	});
});

describe("topHitIsRelevant", () => {
	it("abstains when there is no top hit", () => {
		expect(topHitIsRelevant("anything", undefined)).toBe(false);
	});

	it("abstains on an off-topic query with zero token overlap in the uncertain band", () => {
		const top = makeHit({
			courseName: "Intermediate TypeScript",
			teacherName: "Mike North",
			score: 0.77,
			text: "Mapped types and conditional types in TypeScript.",
		});
		expect(
			topHitIsRelevant("quantum chromodynamics lattice gauge theory", top)
		).toBe(false);
	});

	it("keeps a low-cosine hit that shares a token with the query", () => {
		const top = makeHit({
			courseName: "Node.js v3",
			teacherName: "Scott Moss",
			score: 0.81,
			text: "Readable streams pause and resume to apply backpressure.",
		});
		expect(topHitIsRelevant("node streams backpressure", top)).toBe(true);
	});

	it("keeps a high-confidence hit even without token overlap", () => {
		const top = makeHit({
			courseName: "CSS Grid",
			teacherName: "Jen Kramer",
			score: 0.92,
			text: "Define rows and columns for your layout.",
		});
		expect(topHitIsRelevant("zzzzz", top)).toBe(true);
	});
});

describe("formatRagHits", () => {
	it("numbers sources and omits raw scores", () => {
		const formatted = formatRagHits([
			{
				courseName: "Next.js",
				fileName: "intro",
				teacherName: "Scott Moss",
				timestamp: "1:00",
				score: 0.91,
				text: "Server components render on the server.",
			},
		]);

		expect(formatted).toContain("Source [1]");
		expect(formatted).toContain("Answer using ONLY these transcript sources");
		expect(formatted).not.toContain("Score:");
	});
});
