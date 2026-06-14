import { tool } from "ai";
import { z } from "zod";
import { sql, asc, countDistinct } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import { tryCatch } from "../../../utils/tryCatch";
import type { ToolEnv } from "../env";

export async function listAllInstructors(
	db: ReturnType<typeof drizzle<typeof schema>>
): Promise<string[]> {
	const rows = await db
		.selectDistinct({ instructor: schema.coursesTable.instructor })
		.from(schema.coursesTable)
		.orderBy(asc(schema.coursesTable.instructor));

	return rows.map((r) => r.instructor);
}

export interface CatalogStats {
	totalCourses: number;
	totalInstructors: number;
	topInstructors: { instructor: string; courseCount: number }[];
}

export async function getCatalogStats(
	db: ReturnType<typeof drizzle<typeof schema>>
): Promise<CatalogStats> {
	const [totals] = await db
		.select({
			totalCourses: sql<number>`count(*)`,
			totalInstructors: countDistinct(schema.coursesTable.instructor)
		})
		.from(schema.coursesTable);

	const topInstructors = await db
		.select({
			instructor: schema.coursesTable.instructor,
			courseCount: sql<number>`count(*)`
		})
		.from(schema.coursesTable)
		.groupBy(schema.coursesTable.instructor)
		.orderBy(sql`count(*) desc`, asc(schema.coursesTable.instructor))
		.limit(5);

	return {
		totalCourses: totals?.totalCourses ?? 0,
		totalInstructors: totals?.totalInstructors ?? 0,
		topInstructors
	};
}

export function makeListInstructors(env: ToolEnv) {
	return tool({
		description:
			"List every instructor in the Frontend Masters course catalog. Use this when the user asks who teaches at Frontend Masters or wants to see the full list of instructors.",
		inputSchema: z.object({}),
		execute: async () => {
			if (!env.THREAD_INDEX) {
				return "Course catalog lookup is unavailable in this environment.";
			}

			const db = drizzle(env.THREAD_INDEX, { schema });
			const { data: instructors, error } = await tryCatch(
				listAllInstructors(db)
			);

			if (error) {
				// eslint-disable-next-line no-console
				console.error(
					`[listInstructors] query failed: ${error instanceof Error ? error.message : String(error)}`
				);
				return "Unable to fetch instructors at this time. Please try again.";
			}

			if (instructors.length === 0) {
				return "No instructors found in the course catalog.";
			}

			return `Frontend Masters instructors (${instructors.length}):\n${instructors
				.map((i) => `- ${i}`)
				.join("\n")}`;
		}
	});
}

export function makeCatalogStats(env: ToolEnv) {
	return tool({
		description:
			"Get summary statistics about the Frontend Masters course catalog: total number of courses, total number of instructors, and the instructors with the most courses. Use this for questions like 'how many courses are there?' or 'who teaches the most courses?'.",
		inputSchema: z.object({}),
		execute: async () => {
			if (!env.THREAD_INDEX) {
				return "Course catalog lookup is unavailable in this environment.";
			}

			const db = drizzle(env.THREAD_INDEX, { schema });
			const { data: stats, error } = await tryCatch(getCatalogStats(db));

			if (error) {
				// eslint-disable-next-line no-console
				console.error(
					`[catalogStats] query failed: ${error instanceof Error ? error.message : String(error)}`
				);
				return "Course catalog lookup failed. Please try again.";
			}

			const top = stats.topInstructors
				.map((t) => `- ${t.instructor}: ${t.courseCount}`)
				.join("\n");

			return [
				`Total courses: ${stats.totalCourses}`,
				`Total instructors: ${stats.totalInstructors}`,
				"Instructors with the most courses:",
				top
			].join("\n");
		}
	});
}
