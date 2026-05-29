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

// Eval targets: SCORE_THRESHOLD, TOP_K, MAX_RESULTS_AFTER_DEDUP.
const SCORE_THRESHOLD = 0.7;
const TOP_K = 10;
const MAX_RESULTS_AFTER_DEDUP = 5;

function formatCourseName(raw: string): string {
	return raw.replace(/^\d{4}-\d{2}-\d{2}-/, "").replaceAll("-", " ");
}

export interface RagHit {
	courseName: string;
	fileName: string;
	teacherName: string;
	timestamp: string;
	score: number;
	text: string;
}

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
		throw new Error(`ragSearch failed: ${message}`);
	}

	// eslint-disable-next-line no-console
	console.log(`[ragSearch] received ${results?.length ?? 0} raw results`);

	const filtered = (results ?? []).filter((r) => r.score >= SCORE_THRESHOLD);

	if (filtered.length === 0) {
		return [];
	}

	// Dedup overlapping chunks by (course, file), keep highest score.
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

	return [...seen.values()]
		.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
		.slice(0, MAX_RESULTS_AFTER_DEDUP)
		.map((r) => {
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
			"Search the Frontend Masters course transcript database for relevant content. Use this tool for any programming, web development, or technical question to find accurate course-based answers. Rephrase the user's question as a concise, keyword-rich search query focused on the core technical concept and technology name (e.g. 'Node.js streams backpressure pause resume' not just 'backpressure').",
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
