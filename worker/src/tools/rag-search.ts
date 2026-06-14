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

export interface RagFilters {
	teacherName?: string;
	courseName?: string;
}

// Upstash GLOB is case-sensitive and has no LOWER(), and the stored metadata
// uses raw slugs (e.g. "2024-08-06-complete-intro-containers-v2-brian-holt")
// while callers pass pretty titles ("Complete Intro Containers v2"). Build a
// pattern that is case-insensitive (each cased letter -> [Aa]) and treats any
// run of non-alphanumerics as a wildcard, so titles match slugs both ways.
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

// Single-scope filtering only: a course already implies its instructor, so at
// most one of courseName / teacherName is honored. If both arrive, courseName
// wins (it is the narrower scope) and the conflict is logged.
function buildMetadataFilter(filters?: RagFilters): string | undefined {
	const teacher = filters?.teacherName?.trim();
	const course = filters?.courseName?.trim();

	if (course && teacher) {
		// eslint-disable-next-line no-console
		console.warn(
			"[ragSearch] both courseName and teacherName supplied; using courseName only"
		);
	}

	if (course) return `courseName GLOB '${toLooseGlob(course)}'`;
	if (teacher) return `teacherName GLOB '${toLooseGlob(teacher)}'`;
	return undefined;
}

export async function searchRagIndex(
	query: string,
	vector: Index,
	filters?: RagFilters
): Promise<RagHit[]> {
	const filter = buildMetadataFilter(filters);
	let results;
	try {
		results = await vector.query({
			data: query,
			topK: TOP_K,
			includeMetadata: true,
			includeData: true,
			...(filter ? { filter } : {}),
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
				),
		}),
		execute: async ({ query, teacherName, courseName }) => {
			// eslint-disable-next-line no-console
			console.log(
				`[ragSearch] queryLength=${query.length} filters=${JSON.stringify({ teacherName, courseName })}`
			);

			const hits = await searchRagIndex(query, vector, {
				teacherName,
				courseName,
			});

			if (hits.length === 0) {
				return "No relevant content found in the Frontend Masters course database.";
			}

			return formatRagHits(hits);
		},
	});
}
