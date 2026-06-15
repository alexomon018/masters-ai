import { tool } from "ai";
import { z } from "zod";
import { or, like, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import { tryCatch } from "../../../utils/tryCatch";
import type { ToolEnv } from "../env";

export interface TopicCourseResult {
	instructor: string;
	courseTitle: string;
}

export async function listCoursesForTopic(
	topic: string,
	db: ReturnType<typeof drizzle<typeof schema>>
): Promise<TopicCourseResult[]> {
	const needle = `%${topic}%`;
	const rows = await db
		.select({
			instructor: schema.coursesTable.instructor,
			courseTitle: schema.coursesTable.courseTitle
		})
		.from(schema.coursesTable)
		.where(
			or(
				like(schema.coursesTable.courseTitle, needle),
				like(schema.coursesTable.courseName, needle)
			)
		)
		.orderBy(
			asc(schema.coursesTable.courseTitle),
			asc(schema.coursesTable.instructor)
		);

	return rows;
}

export function formatTopicCourseList(
	topic: string,
	results: TopicCourseResult[]
): string {
	const header = `Frontend Masters courses matching "${topic}":`;
	const lines = results.map((r) => `- ${r.courseTitle} (${r.instructor})`);
	return [header, ...lines].join("\n");
}

export function makeListCoursesByTopic(env: ToolEnv) {
	return tool({
		description:
			"List Frontend Masters courses whose title or course name matches a topic, technology, or keyword (e.g. 'React', 'CSS', 'GraphQL', 'TypeScript'). Use this when the user asks which courses exist on a subject or wants to browse courses by technology. This is an exact keyword lookup over the course catalog, matching both the human-readable course title and the technical course name — for questions about what a course teaches, or topics not mentioned in either field, use ragSearch instead.",
		inputSchema: z.object({
			topic: z
				.string()
				.describe(
					"A topic, technology, or keyword to match against course titles (e.g. 'React' or 'css')"
				)
		}),
		execute: async ({ topic }) => {
			if (!env.THREAD_INDEX) {
				return "Course catalog lookup is unavailable in this environment.";
			}

			const db = drizzle(env.THREAD_INDEX, { schema });
			const { data: results, error } = await tryCatch(
				listCoursesForTopic(topic, db)
			);

			if (error) {
				// eslint-disable-next-line no-console
				console.error(
					`[listCoursesByTopic] query failed: ${error instanceof Error ? error.message : String(error)}`
				);
				return "Unable to fetch courses at this time. Please try again.";
			}

			if (results.length === 0) {
				return `No Frontend Masters courses found with "${topic}" in the title. The topic may still be covered inside a course — try ragSearch.`;
			}

			return formatTopicCourseList(topic, results);
		}
	});
}
