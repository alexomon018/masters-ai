import { Index } from "@upstash/vector";

const PAGE_SIZE = 1000;

// The v2 index stores the clean citable course title in `courseName`, the
// normalized instructor in `teacherName`, and the release date as a dedicated
// `releaseDate` field — so the catalog rows are built directly from metadata.
interface ChunkMetadata {
	courseName?: string;
	teacherName?: string;
	releaseDate?: string;
}

interface CoursePair {
	teacherName: string;
	courseName: string;
	courseTitle: string;
	releasedAt: string;
}

function sqlString(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

async function collectCoursePairs(
	index: Index
): Promise<Map<string, CoursePair>> {
	const pairs = new Map<string, CoursePair>();
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
			const teacherName = meta?.teacherName?.trim();
			const courseName = meta?.courseName?.trim();
			if (!teacherName || !courseName) continue;

			pairs.set(`${teacherName}::${courseName}`, {
				teacherName,
				courseName,
				courseTitle: courseName,
				releasedAt: meta?.releaseDate?.trim() ?? ""
			});
		}

		cursor = page.nextCursor;
	} while (cursor !== "");

	return pairs;
}

function vectorCreds(): { url: string; token: string } {
	const v2Url = process.env.UPSTASH_VECTOR_REST_URL_V2?.trim();
	const v2Token = process.env.UPSTASH_VECTOR_REST_TOKEN_V2?.trim();
	if (v2Url && v2Token) {
		console.error("[backfill-courses] using v2 vector index");
		return { url: v2Url, token: v2Token };
	}
	const url = process.env.UPSTASH_VECTOR_REST_URL;
	const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
	if (!url || !token) {
		console.error(
			"Missing vector creds. Set UPSTASH_VECTOR_REST_URL(_V2)/_TOKEN(_V2). Load worker/.dev.vars and/or .env."
		);
		process.exit(1);
	}
	return { url, token };
}

async function main(): Promise<void> {
	const index = new Index(vectorCreds());
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
				`INSERT INTO courses (instructor, course_name, course_title, released_at) VALUES (${sqlString(r.teacherName)}, ${sqlString(r.courseName)}, ${sqlString(r.courseTitle)}, ${sqlString(r.releasedAt)});`
		)
	];

	process.stdout.write(`${lines.join("\n")}\n`);
}

main().catch((err) => {
	console.error("[backfill-courses] failed:", err);
	process.exit(1);
});
