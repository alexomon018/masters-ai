import { Eval } from "braintrust";

import { searchRagIndex, type RagHit } from "../worker/src/tools/rag-search";
import {
	isRagQueryRewriteEnabled,
	maybeRewriteRagQuery,
} from "../worker/src/tools/rag-query-rewrite";
import type { RagGoldenCase } from "./golden";
import { vectorClient, evalProject } from "./helpers/env";
import { loadGoldenDataset } from "./helpers/loadGolden";
import type { RagTestCase } from "./types";
import {
	hasResultsScorer,
	noResultsScorer,
	topCourseHitScorer,
	top3CourseHitScorer,
	courseHitScorer,
	instructorHitScorer,
	keywordRecallScorer,
} from "./scorers/ragRetrieval";

const testCases = loadGoldenDataset<RagGoldenCase>("rag-search.json");

const vector = vectorClient();

// Query rewrite lives inside the ragSearch tool, so the retrieval eval used to
// bypass it entirely. Apply it here (gated by RAG_QUERY_REWRITE) and tag the
// experiment, so `yarn eval:rag` vs `yarn eval:rag:rewrite` is a real A/B on
// retrieval recall — the main lever for weak models that write poor queries.
const rewriteEnv = {
	ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
	RAG_QUERY_REWRITE: process.env.RAG_QUERY_REWRITE,
};
const rewriteOn = isRagQueryRewriteEnabled(rewriteEnv);

Eval<RagTestCase, RagHit[], RagTestCase>(evalProject(), {
	experimentName: `Masters RAG Search${rewriteOn ? " (rewrite)" : ""}`,
	data: () =>
		testCases.map((tc) => ({
			input: tc,
			expected: tc,
			metadata: {
				id: tc.id,
				difficulty: tc.difficulty,
				category: tc.category,
				rewrite: rewriteOn,
			},
		})),

	task: async (testCase) => {
		const query = await maybeRewriteRagQuery(testCase.query, rewriteEnv, {
			userMessage: testCase.query,
		});
		return searchRagIndex(query, vector, {
			teacherName: testCase.teacherName,
			courseName: testCase.courseName,
		});
	},

	scores: [
		hasResultsScorer,
		noResultsScorer,
		topCourseHitScorer,
		top3CourseHitScorer,
		courseHitScorer,
		instructorHitScorer,
		keywordRecallScorer,
	],
});
