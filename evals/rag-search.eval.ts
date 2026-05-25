// RAG retrieval eval. Calls the production searchRagIndex directly against the
// live Upstash Vector index and scores *what* came back: did the expected
// course/instructor surface, and how much of the expected vocabulary is in the
// snippets. This is the harness for tuning SCORE_THRESHOLD / TOP_K /
// MAX_RESULTS_AFTER_DEDUP in worker/src/tools/rag-search.ts — change a knob,
// re-run, compare experiments in Braintrust.
//
// Run with:  yarn eval:rag

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
