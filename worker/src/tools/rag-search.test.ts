import { describe, expect, it, vi } from "vitest";

import type { Index } from "@upstash/vector";

import {
	filterResultsByScore,
	formatRagHits,
	rerankHits,
	searchRagIndex,
	stripCourseVersion,
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

	it("does not boost a hit on a substring match (token-boundary only)", () => {
		// "css" only appears as a substring of "process" / "success", never as a
		// whole token. With equal cosine, the genuine token match must win.
		const hits: RagHit[] = [
			makeHit({
				courseName: "Build Pipeline",
				score: 0.8,
				text: "The process and success of the build pipeline.",
			}),
			makeHit({
				courseName: "Styling",
				score: 0.8,
				text: "Using css to lay out the page.",
			}),
		];

		const reranked = rerankHits("css", hits);
		expect(reranked[0]?.courseName).toBe("Styling");
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

	it("rejects a hit that only matches the query as a substring", () => {
		// "css" appears inside "process" but is not a whole token, so this
		// uncertain-band hit must be treated as irrelevant.
		const top = makeHit({
			courseName: "Build Tooling",
			teacherName: "Anon",
			score: 0.8,
			text: "The process improves over time.",
		});
		expect(topHitIsRelevant("css", top)).toBe(false);
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

describe("searchRagIndex", () => {
	const row = (over: {
		score: number;
		courseName: string;
		text: string;
	}) => ({
		score: over.score,
		metadata: {
			courseName: over.courseName,
			fileName: "f",
			chunkIndex: 0,
			timestamp: "1:00",
			teacherName: "Jem Young",
		},
		data: over.text,
	});

	const makeVector = (
		impl: (args: { filter?: string }) => unknown[]
	): Index => {
		const query = vi.fn(async (args: { filter?: string }) => impl(args));
		return { query } as unknown as Index;
	};

	it("retries without the filter when the course GLOB yields zero hits", async () => {
		// The user types a slightly different title than the indexed one. The
		// filtered query matches nothing, the unfiltered retry recovers it.
		const vector = makeVector(({ filter }) =>
			filter
				? []
				: [
						row({
							score: 0.83,
							courseName: "Full Stack for Front-End Engineers, v3",
							text: "Full stack for front end engineers setup.",
						}),
					]
		);

		const hits = await searchRagIndex(
			"full stack front end engineers",
			vector,
			{ courseName: "Full Stack for Front End Engineers" }
		);

		expect(vector.query).toHaveBeenCalledTimes(2);
		expect(hits).toHaveLength(1);
		// v2 metadata is already the clean citable title, used verbatim.
		expect(hits[0]?.courseName).toBe("Full Stack for Front-End Engineers, v3");
	});

	it("does not retry when the filtered query already returns hits", async () => {
		const vector = makeVector(() => [
			row({
				score: 0.86,
				courseName: "fullstack v3",
				text: "Full stack for front end engineers setup.",
			}),
		]);

		await searchRagIndex("fullstack", vector, { courseName: "Fullstack" });

		expect(vector.query).toHaveBeenCalledTimes(1);
	});

	it("does not retry when no filter was applied", async () => {
		const vector = makeVector(() => []);

		const hits = await searchRagIndex("anything", vector);

		expect(vector.query).toHaveBeenCalledTimes(1);
		expect(hits).toHaveLength(0);
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

describe("stripCourseVersion", () => {
	it("drops a trailing version so the course family still matches", () => {
		expect(stripCourseVersion("Complete Intro to React, v9")).toBe(
			"Complete Intro to React"
		);
		expect(stripCourseVersion("Complete Intro to React v9")).toBe(
			"Complete Intro to React"
		);
		expect(stripCourseVersion("Complete Intro to React, version 9")).toBe(
			"Complete Intro to React"
		);
		expect(stripCourseVersion("Web Components v.2")).toBe("Web Components");
	});

	it("leaves mid-title numbers and unversioned titles untouched", () => {
		expect(stripCourseVersion("Vue 3 Fundamentals")).toBe("Vue 3 Fundamentals");
		expect(stripCourseVersion("CSS Grid")).toBe("CSS Grid");
	});
});
