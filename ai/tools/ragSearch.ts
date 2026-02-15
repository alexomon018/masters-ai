import { tool } from "ai";
import { z } from "zod";
import { Index } from "@upstash/vector";

const vector = new Index({
	url: process.env.UPSTASH_VECTOR_REST_URL!,
	token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

interface ChunkMetadata {
	courseName: string;
	fileName: string;
	timestamp: string;
	teacherName: string;
}

const SCORE_THRESHOLD = 0.7;

function formatCourseName(raw: string): string {
	return raw.replace(/^\d{4}-\d{2}-\d{2}-/, "").replaceAll("-", " ");
}

export const ragSearch = tool({
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
		const results = await vector.query({
			data: query,
			topK: 10,
			includeMetadata: true,
			includeData: true,
		});

		const filtered = (results ?? []).filter(
			(r) => r.score >= SCORE_THRESHOLD
		);

		if (filtered.length === 0) {
			return "No relevant content found in the Frontend Masters course database.";
		}

		// Deduplicate by course + fileName, keeping highest-scored chunk
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
			.slice(0, 5)
			.map((r) => {
				const meta = r.metadata as ChunkMetadata | undefined;
				const course = meta?.courseName
					? formatCourseName(meta.courseName)
					: "Unknown course";
				const teacher = meta?.teacherName || "Unknown instructor";
				const time = meta?.timestamp || "";

				return `[Course: ${course} | Instructor: ${teacher} | Timestamp: ${time} | Score: ${r.score.toFixed(2)}]\n${r.data}`;
			})
			.join("\n\n---\n\n");
	},
});
