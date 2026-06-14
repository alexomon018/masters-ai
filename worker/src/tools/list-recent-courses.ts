import { tool } from "ai";
import { z } from "zod";
import { sql, desc, gte, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import type { ToolEnv } from "../env";

export interface RecentCourseResult {
	instructor: string;
	courseTitle: string;
	releasedAt: string;
}

export async function listRecentCourses(
	db: ReturnType<typeof drizzle<typeof schema>>,
	options: { sinceYear?: number; limit: number }
): Promise<RecentCourseResult[]> {
	const hasDate = sql`length(${schema.coursesTable.releasedAt}) > 0`;
	const where = options.sinceYear
		? and(hasDate, gte(schema.coursesTable.releasedAt, `${options.sinceYear}-01-01`))
		: hasDate;

	return db
		.select({
			instructor: schema.coursesTable.instructor,
			courseTitle: schema.coursesTable.courseTitle,
			releasedAt: schema.coursesTable.releasedAt
		})
		.from(schema.coursesTable)
		.where(where)
		.orderBy(desc(schema.coursesTable.releasedAt))
		.limit(options.limit);
}

export function formatRecentCourses(results: RecentCourseResult[]): string {
	return results
		.map((r) => `- ${r.releasedAt} — ${r.courseTitle} (${r.instructor})`)
		.join("\n");
}

export function makeListRecentCourses(env: ToolEnv) {
	return tool({
		description:
			"List the most recently released Frontend Masters courses, newest first. Use this when the user asks what's new, recent, or latest, or wants courses from a specific year onward. Optionally filter by a starting year.",
		inputSchema: z.object({
			sinceYear: z
				.number()
				.int()
				.optional()
				.describe(
					"Optional. Only include courses released in or after this year (e.g. 2024)"
				),
			limit: z
				.number()
				.int()
				.min(1)
				.max(50)
				.default(10)
				.describe("How many courses to return (default 10, max 50)")
		}),
		execute: async ({ sinceYear, limit }) => {
			if (!env.THREAD_INDEX) {
				return "Course catalog lookup is unavailable in this environment.";
			}

			const db = drizzle(env.THREAD_INDEX, { schema });
			const results = await listRecentCourses(db, { sinceYear, limit });

			if (results.length === 0) {
				return sinceYear
					? `No Frontend Masters courses found released in or after ${sinceYear}.`
					: "No dated courses found in the catalog.";
			}

			const header = sinceYear
				? `Frontend Masters courses released since ${sinceYear} (newest first):`
				: "Most recent Frontend Masters courses (newest first):";
			return `${header}\n${formatRecentCourses(results)}`;
		}
	});
}
