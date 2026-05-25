// RAG search over the Frontend Masters transcript Upstash Vector index.
// Direct port of ai/tools/ragSearch.ts, refactored as a factory so the Index
// client is built per-request with env-bound credentials.

import { tool } from "ai";
import { z } from "zod";
import { Index } from "@upstash/vector";
import type { ToolEnv } from "../env";

interface ChunkMetadata {
	courseName: string;
	fileName: string;
	timestamp: string;
	teacherName: string;
}

// TUNE: retrieval knobs. These are the obvious eval targets when wiring
// up the harness — score them against a golden set of (question, expected
// course/instructor/keyphrases) cases.
//
// - SCORE_THRESHOLD: drop chunks below this cosine score. Too high → empty
//   results on legit questions. Too low → noise drowns the citation.
// - TOP_K: how many raw chunks to pull from Upstash. Bigger = more dedup
//   opportunity, more cost, more latency.
// - MAX_RESULTS_AFTER_DEDUP: how many distinct (course, file) snippets we
//   actually hand to the model.
const SCORE_THRESHOLD = 0.7;
const TOP_K = 10;
const MAX_RESULTS_AFTER_DEDUP = 5;

function formatCourseName(raw: string): string {
	return raw.replace(/^\d{4}-\d{2}-\d{2}-/, "").replaceAll("-", " ");
}

// One retrieved snippet, post-threshold and post-dedup. The course name is
// already formatted (date prefix stripped, dashes → spaces) so both the
// model-facing string and the eval scorers see identical values.
export interface RagHit {
	courseName: string;
	fileName: string;
	teacherName: string;
	timestamp: string;
	score: number;
	text: string;
}

// Core retrieval: query Upstash Vector, drop low-score chunks, dedup by
// (course, file), and return the top-N as structured hits. Split out from the
// tool's execute closure so the eval harness can score *what* was retrieved
// (course/instructor/keywords) rather than only the formatted string the model
// sees. The tool below reuses this, so production behavior is unchanged.
export async function searchRagIndex(
	query: string,
	vector: Index
): Promise<RagHit[]> {
	let results;
	try {
		results = await vector.query({
			data: query,
			topK: TOP_K,
			includeMetadata: true,
			includeData: true,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		// eslint-disable-next-line no-console
		console.error(`[ragSearch] vector.query threw: ${message}`);
		// Re-throw with a model-friendly message so the SDK reports an
		// output-error and the UI shows the failed pill — but include
		// the cause in the worker logs above so we can diagnose.
		throw new Error(`ragSearch failed: ${message}`);
	}

	// eslint-disable-next-line no-console
	console.log(`[ragSearch] received ${results?.length ?? 0} raw results`);

	const filtered = (results ?? []).filter((r) => r.score >= SCORE_THRESHOLD);

	if (filtered.length === 0) {
		return [];
	}

	// Deduplicate by course + fileName, keeping the highest-scoring chunk.
	// Course transcripts are chunked into overlapping windows; without this
	// dedup the agent often sees three near-identical snippets and cites the
	// same lesson three times.
	const seen = filtered.reduce(
		(map, r) => {
			const meta = r.metadata as ChunkMetadata | undefined;
			const key = `${meta?.courseName}::${meta?.fileName}`;
			if (!map.has(key) || r.score > (map.get(key)!.score ?? 0)) {
				map.set(key, r);
			}
			return map;
		},
		new Map<string, (typeof filtered)[0]>()
	);

	return [...seen.values()].slice(0, MAX_RESULTS_AFTER_DEDUP).map((r) => {
		const meta = r.metadata as ChunkMetadata | undefined;
		return {
			courseName: meta?.courseName
				? formatCourseName(meta.courseName)
				: "Unknown course",
			fileName: meta?.fileName ?? "",
			teacherName: meta?.teacherName || "Unknown instructor",
			timestamp: meta?.timestamp || "",
			score: r.score,
			text: typeof r.data === "string" ? r.data : "",
		};
	});
}

// Render hits into the model-facing string. Kept separate so the format is in
// one place; the byte layout matches the original execute() return exactly.
export function formatRagHits(hits: RagHit[]): string {
	return hits
		.map(
			(h) =>
				`[Course: ${h.courseName} | Instructor: ${h.teacherName} | Timestamp: ${h.timestamp} | Score: ${h.score.toFixed(2)}]\n${h.text}`
		)
		.join("\n\n---\n\n");
}

export function makeRagSearch(env: ToolEnv) {
	if (!env.UPSTASH_VECTOR_REST_URL || !env.UPSTASH_VECTOR_REST_TOKEN) {
		// eslint-disable-next-line no-console
		console.error(
			"[ragSearch] missing UPSTASH_VECTOR_REST_URL / UPSTASH_VECTOR_REST_TOKEN — the tool will fail. Set both in worker/.dev.vars."
		);
	}

	const vector = new Index({
		url: env.UPSTASH_VECTOR_REST_URL,
		token: env.UPSTASH_VECTOR_REST_TOKEN,
	});

	return tool({
		description:
			"Search the Frontend Masters course transcript database for relevant content. Use this tool for any programming, web development, or technical question to find accurate course-based answers. Rephrase the user's question as a concise, keyword-rich search query focused on the core technical concept.",
		inputSchema: z.object({
			query: z
				.string()
				.describe(
					"A concise, keyword-rich search query focused on the core technical concept"
				),
		}),
		execute: async ({ query }) => {
			// eslint-disable-next-line no-console
			console.log(`[ragSearch] query=${JSON.stringify(query)}`);

			const hits = await searchRagIndex(query, vector);

			if (hits.length === 0) {
				return "No relevant content found in the Frontend Masters course database.";
			}

			return formatRagHits(hits);
		},
	});
}
