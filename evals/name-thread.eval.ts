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
