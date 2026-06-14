import { tool } from "ai";
import { z } from "zod";
import { like, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import type { ToolEnv } from "../env";

export interface CourseListResult {
	matchedInstructor: string;
	courses: string[];
}

export async function listCoursesForInstructor(
	instructor: string,
	db: ReturnType<typeof drizzle<typeof schema>>
): Promise<CourseListResult[]> {
	const rows = await db
		.select({
			instructor: schema.coursesTable.instructor,
			courseTitle: schema.coursesTable.courseTitle,
		})
		.from(schema.coursesTable)
		.where(like(schema.coursesTable.instructor, `%${instructor}%`))
		.orderBy(
			asc(schema.coursesTable.instructor),
			asc(schema.coursesTable.courseTitle)
		);

	const byInstructor = rows.reduce((map, r) => {
		const list = map.get(r.instructor) ?? [];
		list.push(r.courseTitle);
		map.set(r.instructor, list);
		return map;
	}, new Map<string, string[]>());

	return [...byInstructor.entries()].map(([matchedInstructor, courses]) => ({
		matchedInstructor,
		courses,
	}));
}

export function formatCourseList(results: CourseListResult[]): string {
	return results
		.map(
			(r) =>
				`Instructor: ${r.matchedInstructor}\n${r.courses
					.map((c) => `- ${c}`)
					.join("\n")}`
		)
		.join("\n\n");
}

export function makeListCourses(env: ToolEnv) {
	return tool({
		description:
			"Look up the exact, complete list of Frontend Masters courses taught by a specific instructor. Use this whenever the user asks which courses an instructor teaches, or to enumerate an instructor's courses. This is an exact catalog lookup — prefer it over ragSearch for instructor-to-course questions, since ragSearch cannot reliably list every course.",
		inputSchema: z.object({
			instructor: z
				.string()
				.describe(
					"The instructor's name, or part of it (e.g. 'Will Sentance' or 'Sentance')"
				),
		}),
		execute: async ({ instructor }) => {
			if (!env.THREAD_INDEX) {
				return "Course catalog lookup is unavailable in this environment.";
			}

			const db = drizzle(env.THREAD_INDEX, { schema });
			const results = await listCoursesForInstructor(instructor, db);

			if (results.length === 0) {
				return `No Frontend Masters courses found for an instructor matching "${instructor}".`;
			}

			return formatCourseList(results);
		},
	});
}
