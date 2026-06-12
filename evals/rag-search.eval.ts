import { Eval } from "braintrust";

import { searchRagIndex, type RagHit } from "../worker/src/tools/rag-search";
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

Eval<RagTestCase, RagHit[], RagTestCase>(evalProject(), {
	experimentName: "Masters RAG Search",
	data: () =>
		testCases.map((tc) => ({
			input: tc,
			expected: tc,
			metadata: {
				id: tc.id,
				difficulty: tc.difficulty,
				category: tc.category,
			},
		})),

	task: async (testCase) => searchRagIndex(testCase.query, vector),

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
