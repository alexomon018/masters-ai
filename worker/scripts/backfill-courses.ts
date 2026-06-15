import { Index } from "@upstash/vector";

const PAGE_SIZE = 1000;

interface ChunkMetadata {
	courseName?: string;
	teacherName?: string;
}

const INSTRUCTOR_ALIASES: Record<string, string> = {
	"biran holt": "Brian Holt",
	"erik reinhart": "Erik Reinert",
	"jerome hardway": "Jerome Hardaway",
	"the primagen": "The Primeagen"
};

const TERM_CASING: Record<string, string> = {
	ui: "UI",
	ux: "UX",
	css: "CSS",
	js: "JS",
	ts: "TS",
	api: "API",
	apis: "APIs",
	ai: "AI",
	cpu: "CPU",
	vm: "VM",
	sql: "SQL",
	sqlite: "SQLite",
	php: "PHP",
	pwa: "PWA",
	pwas: "PWAs",
	ios: "iOS",
	cms: "CMS",
	dotnet: "dotnet",
	graphql: "GraphQL",
	devops: "DevOps",
	nextjs: "Next.js",
	nodejs: "Node.js",
	openai: "OpenAI",
	chatgpt: "ChatGPT"
};

function normalizeInstructor(raw: string): string {
	return INSTRUCTOR_ALIASES[raw.toLowerCase()] ?? raw;
}

const INSTRUCTOR_NAME_TOKENS: Map<string, Set<string>> = (() => {
	const byCanonical = new Map<string, Set<string>>();
	const add = (canonical: string, source: string) => {
		const set = byCanonical.get(canonical) ?? new Set<string>();
		for (const token of source
			.toLowerCase()
			.split(/[\s-]+/)
			.filter(Boolean)) {
			set.add(token);
		}
		byCanonical.set(canonical, set);
	};
	for (const [alias, canonical] of Object.entries(INSTRUCTOR_ALIASES)) {
		add(canonical, alias);
		add(canonical, canonical);
	}
	return byCanonical;
})();

function slugToTitle(slug: string, instructor: string): string {
	const withoutDate = slug.replace(/^\d{4}-\d{2}-\d{2}-/, "");

	const nameTokens = new Set(
		instructor
			.toLowerCase()
			.split(/[\s-]+/)
			.filter(Boolean)
	);
	for (const token of INSTRUCTOR_NAME_TOKENS.get(instructor) ?? []) {
		nameTokens.add(token);
	}

	const tokens = withoutDate.split("-").filter(Boolean);
	while (
		tokens.length > 0 &&
		nameTokens.has(tokens[tokens.length - 1].toLowerCase())
	) {
		tokens.pop();
	}

	return tokens
		.map((token) => {
			const lower = token.toLowerCase();
			if (TERM_CASING[lower]) return TERM_CASING[lower];
			if (/^v\d+$/.test(lower)) return lower;
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join(" ");
}

function releaseDate(slug: string): string {
	return /^\d{4}-\d{2}-\d{2}/.exec(slug)?.[0] ?? "";
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
