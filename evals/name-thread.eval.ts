// Thread-naming eval. Calls the production runLLM (ai/llm.ts → Anthropic Haiku)
// on canned conversations and scores the title two ways: deterministic format
// rules (the ones the prompt + sanitizeTitle enforce) and an LLM-as-judge
// summary check that the title actually captures the topic.
//
// Run with:  yarn eval:name-thread

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Eval } from "braintrust";
import { Summary } from "autoevals";

import { runLLM, type NameThreadMessage } from "../ai/llm";
import type { NameThreadTestCase } from "./types";
import { titleFormatScorer, titleTopicScorer } from "./scorers/titleFormat";
import { evalProject } from "./helpers/env";

const testCases: NameThreadTestCase[] = JSON.parse(
	readFileSync(join("evals", "datasets", "name-thread.json"), "utf-8")
);

// LLM-as-judge: is the title a faithful summary of the conversation? Summary
// compares output vs. expected given the input; we feed the transcript as the
// input and the title as both output and (best-known) expected topic so the
// judge rates topical fit. Skips the deliberately-vague "New Chat" rows.
const transcriptOf = (messages: NameThreadMessage[]): string =>
	messages.map((m) => `${m.role}: ${m.content}`).join("\n");

Eval<NameThreadTestCase, string, NameThreadTestCase>(evalProject("Masters Thread Naming"), {
	data: () =>
		testCases.map((tc) => ({
			input: tc,
			expected: tc,
			metadata: { id: tc.id, shouldBeNewChat: tc.shouldBeNewChat ?? false },
		})),

	task: async (testCase) =>
		runLLM(testCase.messages as NameThreadMessage[]),

	scores: [
		titleFormatScorer,
		titleTopicScorer,
		// LLM judge — only meaningful for real topics, not the New Chat fallback.
		async ({ output, input }) => {
			if (input.shouldBeNewChat) return null;
			const transcript = transcriptOf(input.messages as NameThreadMessage[]);
			const result = await Summary({
				input: transcript,
				output,
				expected: (input.expectedTopicKeywords ?? []).join(", ") || output,
			});
			return { name: "TopicSummary", score: result.score ?? 0 };
		},
	],
});
