import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Eval } from "braintrust";

import { searchRagIndex, type RagHit } from "../worker/src/tools/rag-search";
import { vectorClient, evalProject } from "./helpers/env";
import type { RagTestCase } from "./types";
import {
	hasResultsScorer,
	courseHitScorer,
	instructorHitScorer,
	keywordRecallScorer,
} from "./scorers/ragRetrieval";

const testCases: RagTestCase[] = JSON.parse(
	readFileSync(join("evals", "datasets", "rag-search.json"), "utf-8")
);

const vector = vectorClient();

Eval<RagTestCase, RagHit[], RagTestCase>(evalProject("Masters RAG Search"), {
	data: () =>
		testCases.map((tc) => ({
			input: tc,
			expected: tc,
			metadata: { id: tc.id },
		})),

	task: async (testCase) => searchRagIndex(testCase.query, vector),

	scores: [
		hasResultsScorer,
		courseHitScorer,
		instructorHitScorer,
		keywordRecallScorer,
	],
});
