import { tool } from "ai";
import { z } from "zod";
import { Index } from "@upstash/vector";
import type { ToolEnv } from "../env";
import { tryCatch } from "../../../utils/tryCatch";
import {
	maybeRewriteRagQuery,
	type RagQueryRewriteContext
} from "./rag-query-rewrite";
import { normalizeInstructor, slugToTitle } from "../course-name";

interface ChunkMetadata {
	courseName: string;
	fileName: string;
	timestamp: string;
	teacherName: string;
}

export const SCORE_THRESHOLD = 0.7;
export const FALLBACK_THRESHOLD = 0.5;
export const FALLBACK_MAX_RESULTS = 3;
// Pull a wide candidate pool so the rerank can recover an on-topic chunk that
// cosine alone buries below rank 10 (e.g. the Node.js streams chunk sits at
// rank ~17 behind higher-cosine React/Java hits). Output is still trimmed to
// MAX_RESULTS_AFTER_DEDUP, so the model sees the same amount either way.
export const TOP_K = 30;
export const MAX_RESULTS_AFTER_DEDUP = 5;
// Cosine score that is trustworthy on its own, even without lexical overlap.
// Below this, a top hit must share at least one query token to be returned —
// otherwise it is almost certainly an embedding artifact (every chunk scores
// ~0.76 against a genuinely off-topic query).
export const HIGH_CONFIDENCE_THRESHOLD = 0.85;

type VectorQueryResult = {
	score: number;
	metadata?: ChunkMetadata;
	data?: unknown;
};

export interface RagHit {
	courseName: string;
	fileName: string;
	teacherName: string;
	timestamp: string;
	score: number;
	text: string;
}

export interface RagFilters {
	teacherName?: string;
	courseName?: string;
}

function tokenize(value: string): string[] {
	return (
		value
			.toLowerCase()
			.match(/[a-z0-9]+/g)
			?.filter((token) => token.length > 2) ?? []
	);
}

// Token-set membership, not substring: "css" must match the whole token "css",
// never appear inside "process". Substring matching produced false positives
// where a short query token boosted or rescued unrelated hits.
function tokenSet(value: string): Set<string> {
	return new Set(
		(value.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
			(token) => token.length > 0
		)
	);
}

// Lexical overlap weight. Lets the rerank reorder hits inside the typical
// cosine band (~0.7–0.95) — weak models lean hard on rank-1, so getting the
// top hit right matters most for them.
const OVERLAP_WEIGHT = 0.15;
// Course title is a strong topical signal: a query that names the course
// subject ("css grid") should favor that course's chunks. The match is
// IDF-weighted (see rerankHits) so a generic title token can't dominate.
const COURSE_MATCH_WEIGHT = 0.2;

export function rerankHits(query: string, hits: RagHit[]): RagHit[] {
	const queryTokens = tokenize(query);
	if (queryTokens.length === 0) return hits;
	const queryTokenSet = new Set(queryTokens);

	// Down-weight course-title tokens that are common across the candidate pool
	// (e.g. "react" appears in many course titles) so a generic title match
	// can't outrank the canonical course — "React Server Components" should
	// favour Next.js, not "client graphql react". A rare, specific token
	// ("next", "grid", "node") keeps close to its full boost.
	const courseDocFreq = new Map<string, number>();
	for (const hit of hits) {
		for (const token of new Set(tokenize(hit.courseName))) {
			courseDocFreq.set(token, (courseDocFreq.get(token) ?? 0) + 1);
		}
	}
	const idf = (token: string) =>
		Math.log((hits.length + 1) / ((courseDocFreq.get(token) ?? 0) + 1)) + 1;

	return [...hits]
		.map((hit) => {
			const haystack = tokenSet(
				`${hit.courseName} ${hit.teacherName} ${hit.text}`
			);
			const overlap =
				queryTokens.filter((token) => haystack.has(token)).length /
				queryTokens.length;
			const courseTokens = tokenize(hit.courseName);
			const matchWeight = courseTokens
				.filter((token) => queryTokenSet.has(token))
				.reduce((sum, token) => sum + idf(token), 0);
			const totalWeight = courseTokens.reduce(
				(sum, token) => sum + idf(token),
				0
			);
			const courseMatch = totalWeight > 0 ? matchWeight / totalWeight : 0;
			return {
				hit,
				rankScore:
					hit.score +
					overlap * OVERLAP_WEIGHT +
					courseMatch * COURSE_MATCH_WEIGHT
			};
		})
		.sort((a, b) => b.rankScore - a.rankScore)
		.map(({ hit }) => hit);
}

// True when the top hit is worth returning. A hit clears the bar if it is
// high-confidence by cosine alone, or if it shares any token with the query.
// An off-topic query (e.g. "quantum chromodynamics lattice gauge theory")
// still draws ~0.77 cosine hits with zero token overlap, so this lets the
// search abstain instead of surfacing confident nonsense.
export function topHitIsRelevant(
	query: string,
	top: RagHit | undefined
): boolean {
	if (!top) return false;
	if (top.score >= HIGH_CONFIDENCE_THRESHOLD) return true;

	const queryTokens = tokenize(query);
	if (queryTokens.length === 0) return true;

	const haystack = tokenSet(
		`${top.courseName} ${top.teacherName} ${top.text}`
	);
	return queryTokens.some((token) => haystack.has(token));
}

export function filterResultsByScore(
	results: VectorQueryResult[] | undefined
): VectorQueryResult[] {
	const rows = results ?? [];
	const primary = rows.filter((row) => row.score >= SCORE_THRESHOLD);
	if (primary.length > 0) return primary;

	const fallback = rows
		.filter((row) => row.score >= FALLBACK_THRESHOLD)
		.sort((a, b) => b.score - a.score)
		.slice(0, FALLBACK_MAX_RESULTS);

	return fallback;
}

function toLooseGlob(value: string): string {
	const tokens = value.toLowerCase().match(/[a-z0-9]+/g);
	if (!tokens || tokens.length === 0) return "*";

	const pattern = tokens
		.map((token) =>
			[...token]
				.map((ch) =>
					ch >= "a" && ch <= "z" ? `[${ch.toUpperCase()}${ch}]` : ch
				)
				.join("")
		)
		.join("*");

	return `*${pattern}*`;
}

// Drop a trailing course-version token ("v9", "version 9", "v.9") before
// building the GLOB. A user pasting "Complete Intro to React, v9" when the
// index only holds v8 would otherwise produce a filter ending in `*[Vv]9*`
// that matches zero rows — silently zeroing recall for the right course.
// Matching the course family lets the embedding rank the closest version.
export function stripCourseVersion(course: string): string {
	return course
		.replace(/[,\s]*\bv(?:ersion)?\.?\s*\d+\b\s*$/i, "")
		.trim();
}

function buildMetadataFilter(filters?: RagFilters): string | undefined {
	const teacher = filters?.teacherName?.trim();
	const course = filters?.courseName?.trim();

	if (course && teacher) {
		// eslint-disable-next-line no-console
		console.warn(
			"[ragSearch] both courseName and teacherName supplied; using courseName only"
		);
	}

	if (course) {
		const family = stripCourseVersion(course) || course;
		return `courseName GLOB '${toLooseGlob(family)}'`;
	}
	if (teacher) return `teacherName GLOB '${toLooseGlob(teacher)}'`;
	return undefined;
}

function dedupResults(filtered: VectorQueryResult[]): VectorQueryResult[] {
	const seen = filtered.reduce((map, row, index) => {
		const meta = row.metadata;
		// Dedup on course+file when present, but rows with missing metadata must
		// stay distinct (collapsing them on `undefined::undefined` drops recall
		// before the rerank). Fall back to the row content / position so each
		// metadata-less hit keeps its own key.
		const key =
			meta?.courseName || meta?.fileName
				? `${meta?.courseName ?? ""}::${meta?.fileName ?? ""}`
				: `__row_${typeof row.data === "string" ? row.data : index}`;
		if (!map.has(key) || row.score > (map.get(key)!.score ?? 0)) {
			map.set(key, row);
		}
		return map;
	}, new Map<string, VectorQueryResult>());

	return [...seen.values()].sort((a, b) => b.score - a.score);
}

function toRagHits(results: VectorQueryResult[]): RagHit[] {
	return results.map((row) => {
		const meta = row.metadata;
		const teacherName = meta?.teacherName
			? normalizeInstructor(meta.teacherName)
			: "Unknown instructor";
		return {
			courseName: meta?.courseName
				? slugToTitle(meta.courseName, teacherName)
				: "Unknown course",
			fileName: meta?.fileName ?? "",
			teacherName,
			timestamp: meta?.timestamp || "",
			score: row.score,
			text: typeof row.data === "string" ? row.data : ""
		};
	});
}

async function queryAndRank(
	query: string,
	vector: Index,
	filter?: string
): Promise<RagHit[]> {
	const { data: results, error } = await tryCatch(
		vector.query({
			data: query,
			topK: TOP_K,
			includeMetadata: true,
			includeData: true,
			...(filter ? { filter } : {})
		})
	);
	if (error) {
		// eslint-disable-next-line no-console
		console.error(`[ragSearch] vector.query threw: ${error.message}`);
		throw new Error(`ragSearch failed: ${error.message}`);
	}

	// eslint-disable-next-line no-console
	console.log(`[ragSearch] received ${results?.length ?? 0} raw results`);

	const filtered = filterResultsByScore(results as VectorQueryResult[]);
	if (filtered.length === 0) {
		return [];
	}

	// Rerank the full deduped candidate pool BEFORE trimming. Slicing first
	// (the old behavior) meant a strong lexical match ranked 6th by cosine was
	// dropped before the rerank ever saw it — so the rerank only shuffled the
	// top 5 instead of choosing them.
	const deduped = dedupResults(filtered);
	const hits = toRagHits(deduped);
	const ranked = rerankHits(query, hits);
	if (!topHitIsRelevant(query, ranked[0])) {
		return [];
	}
	return ranked.slice(0, MAX_RESULTS_AFTER_DEDUP);
}

export async function searchRagIndex(
	query: string,
	vector: Index,
	filters?: RagFilters
): Promise<RagHit[]> {
	const filter = buildMetadataFilter(filters);
	const hits = await queryAndRank(query, vector, filter);
	if (hits.length > 0 || !filter) {
		return hits;
	}

	// The metadata GLOB is an AND-of-all-tokens hard filter, so a course/teacher
	// name that doesn't match the indexed slug zeroes recall even when the course
	// is in the index — e.g. the user types "Full Stack for Front-End Engineers"
	// but the slug is "fullstack v3". Retry without the filter so embedding
	// similarity can recover the course on its own.
	// eslint-disable-next-line no-console
	console.log(`[ragSearch] filter '${filter}' yielded 0 hits; retrying unfiltered`);
	return queryAndRank(query, vector);
}

export function formatRagHits(hits: RagHit[]): string {
	const blocks = hits.map(
		(hit, index) =>
			`Source [${index + 1}] — Course: ${hit.courseName} | Instructor: ${hit.teacherName} | Timestamp: ${hit.timestamp}\n${hit.text}`
	);

	return [
		"Answer using ONLY these transcript sources. When citing, use the exact Course and Instructor names shown below.",
		"",
		blocks.join("\n\n---\n\n")
	].join("\n");
}

export function makeRagSearch(env: ToolEnv, context?: RagQueryRewriteContext) {
	if (!env.UPSTASH_VECTOR_REST_URL || !env.UPSTASH_VECTOR_REST_TOKEN) {
		// eslint-disable-next-line no-console
		console.error(
			"[ragSearch] missing UPSTASH_VECTOR_REST_URL / UPSTASH_VECTOR_REST_TOKEN — the tool will fail. Set both in worker/.dev.vars."
		);
	}

	const vector = new Index({
		url: env.UPSTASH_VECTOR_REST_URL,
		token: env.UPSTASH_VECTOR_REST_TOKEN
	});

	return tool({
		description:
			"Search the Frontend Masters course transcript database for relevant content. Use this tool for any programming, web development, or technical question to find accurate course-based answers. Rephrase the user's question as a concise, keyword-rich search query focused on the core technical concept and technology name (e.g. 'Node.js streams backpressure pause resume' not just 'backpressure') — do not pad the query with a long list of loosely related technologies. When the user scopes the question to a specific course or instructor (e.g. \"in Will Sentance's Node course\"), set courseName OR teacherName to restrict results — set only one, since a course already implies its instructor. Course and instructor names may be passed as the human-readable title or partial name (e.g. 'Complete Intro Containers v2' or 'Containers'); matching is case- and punctuation-insensitive.",
		inputSchema: z.object({
			query: z
				.string()
				.describe(
					"A concise, keyword-rich search query focused on the core technical concept"
				),
			teacherName: z
				.string()
				.optional()
				.describe(
					"Optional. Restrict results to a specific instructor; full or partial name, case- and punctuation-insensitive (e.g. 'Sentance'). Do not set if courseName is set."
				),
			courseName: z
				.string()
				.optional()
				.describe(
					"Optional. Restrict results to a specific course; the human-readable title or part of it, case- and punctuation-insensitive (e.g. 'Complete Intro Containers v2' or 'Containers')."
				)
		}),
		execute: async ({ query, teacherName, courseName }) => {
			const rewrittenQuery = await maybeRewriteRagQuery(query, env, context);
			// eslint-disable-next-line no-console
			console.log(
				`[ragSearch] queryLength=${rewrittenQuery.length} filters=${JSON.stringify({ teacherName, courseName })}`
			);

			const hits = await searchRagIndex(rewrittenQuery, vector, {
				teacherName,
				courseName
			});

			if (hits.length === 0) {
				return "No relevant content found in the Frontend Masters course database.";
			}

			return formatRagHits(hits);
		}
	});
}
