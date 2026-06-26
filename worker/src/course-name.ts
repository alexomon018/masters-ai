// Course/instructor name normalization shared by the D1 catalog backfill
// (worker/scripts/backfill-courses.ts) and ragSearch source headers
// (worker/src/tools/rag-search.ts), so a course shows the same clean title in
// both places. Vector metadata stores a hyphenated slug with the instructor
// name fused onto the end (e.g. "algorithms-the-primeagen") and inconsistent
// casing; this module strips the instructor suffix, normalizes casing, and
// canonicalizes misspelled instructor names.

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

export function normalizeInstructor(raw: string): string {
	const trimmed = raw.trim();
	return INSTRUCTOR_ALIASES[trimmed.toLowerCase()] ?? trimmed;
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

export function slugToTitle(slug: string, instructor: string): string {
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

	const tokens = withoutDate.split(/[\s-]+/).filter(Boolean);
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

export function releaseDate(slug: string): string {
	return /^\d{4}-\d{2}-\d{2}/.exec(slug)?.[0] ?? "";
}
