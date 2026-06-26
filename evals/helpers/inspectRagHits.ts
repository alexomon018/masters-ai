import "dotenv/config";
import { searchRagIndex } from "../../worker/src/tools/rag-search";
import { vectorClient } from "./env";

/**
 * Print the live ragSearch hits for one or more questions, so golden cases can
 * be authored from what the transcripts ACTUALLY say instead of idealized
 * textbook wording. Targets the same vector index the evals use (v2 when its
 * `_V2` creds are set — see `vectorCreds` in env.ts).
 *
 * Usage:
 *   tsx evals/helpers/inspectRagHits.ts "React Server Components vs client components"
 *   tsx evals/helpers/inspectRagHits.ts "css grid" --full   # print full chunk text
 */

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const full = args.includes("--full");
	const queries = args.filter((a) => !a.startsWith("--"));

	if (queries.length === 0) {
		// eslint-disable-next-line no-console
		console.error(
			'Provide at least one question, e.g.\n  tsx evals/helpers/inspectRagHits.ts "what are React Server Components"'
		);
		process.exitCode = 1;
		return;
	}

	const vector = vectorClient();

	for (const query of queries) {
		// eslint-disable-next-line no-await-in-loop
		const hits = await searchRagIndex(query, vector);
		// eslint-disable-next-line no-console
		console.log(`\n=== "${query}" -> ${hits.length} hits ===`);
		hits.forEach((hit, i) => {
			const preview = full ? hit.text : `${hit.text.slice(0, 240)}…`;
			// eslint-disable-next-line no-console
			console.log(
				`\n[${i + 1}] score ${hit.score.toFixed(3)} | ${hit.courseName} — ${hit.teacherName} @ ${hit.timestamp}\n${preview}`
			);
		});
	}
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	// eslint-disable-next-line no-console
	console.error(`inspectRagHits failed: ${message}`);
	process.exitCode = 1;
});
