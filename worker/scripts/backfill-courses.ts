import { Index } from "@upstash/vector";
import {
	normalizeInstructor,
	slugToTitle,
	releaseDate
} from "../src/course-name";

const PAGE_SIZE = 1000;

interface ChunkMetadata {
	courseName?: string;
	teacherName?: string;
}

function sqlString(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

async function collectCoursePairs(
	index: Index
): Promise<Map<string, { teacherName: string; courseName: string }>> {
	const pairs = new Map<string, { teacherName: string; courseName: string }>();
	let cursor = "";

	do {
		// eslint-disable-next-line no-await-in-loop
		const page = await index.range({
			cursor,
			limit: PAGE_SIZE,
			includeMetadata: true
		});

		for (const vec of page.vectors) {
			const meta = vec.metadata as ChunkMetadata | undefined;
			const rawTeacher = meta?.teacherName?.trim();
			const courseName = meta?.courseName?.trim();
			if (!rawTeacher || !courseName) continue;
			const teacherName = normalizeInstructor(rawTeacher);
			pairs.set(`${teacherName}::${courseName}`, { teacherName, courseName });
		}

		cursor = page.nextCursor;
	} while (cursor !== "");

	return pairs;
}

async function main(): Promise<void> {
	const url = process.env.UPSTASH_VECTOR_REST_URL;
	const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
	if (!url || !token) {
		console.error(
			"Missing UPSTASH_VECTOR_REST_URL / UPSTASH_VECTOR_REST_TOKEN. Load worker/.dev.vars."
		);
		process.exit(1);
	}

	const index = new Index({ url, token });
	const pairs = await collectCoursePairs(index);

	const rows = [...pairs.values()].sort(
		(a, b) =>
			a.teacherName.localeCompare(b.teacherName) ||
			a.courseName.localeCompare(b.courseName)
	);

	// stderr so it doesn't pollute the SQL on stdout.
	console.error(
		`[backfill-courses] ${rows.length} distinct (instructor, course) pairs`
	);

	// No explicit BEGIN/COMMIT: `wrangler d1 execute --file` runs the statements
	// as one batch (atomic) on D1, and remote D1 (Durable Object SQLite) rejects
	// raw BEGIN TRANSACTION / SAVEPOINT — it requires the JS transaction API.
	const lines = [
		"DELETE FROM courses;",
		...rows.map(
			(r) =>
				`INSERT INTO courses (instructor, course_name, course_title, released_at) VALUES (${sqlString(r.teacherName)}, ${sqlString(r.courseName)}, ${sqlString(slugToTitle(r.courseName, r.teacherName))}, ${sqlString(releaseDate(r.courseName))});`
		)
	];

	process.stdout.write(`${lines.join("\n")}\n`);
}

main().catch((err) => {
	console.error("[backfill-courses] failed:", err);
	process.exit(1);
});
