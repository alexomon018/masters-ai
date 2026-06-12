import { Eval } from "braintrust";
import { Summary } from "autoevals";

import {
	runNameThread,
	type NameThreadMessage,
} from "../worker/src/routes/name-thread";
import { startBraintrustNode, generateText } from "./helpers/braintrustNode";
import type { NameThreadGoldenCase } from "./golden";
import {
	canRunLlmJudge,
	ensureAutoevalsInit,
	getLlmJudgeModel,
} from "./helpers/autoevalsInit";
import { loadGoldenDataset } from "./helpers/loadGolden";
import { titleFormatScorer, titleTopicScorer } from "./scorers/titleFormat";
import { evalProject, modelEnv } from "./helpers/env";
import type { NameThreadTestCase } from "./types";

// Use the Node-wrapped generateText (see chat-agent.eval.ts) so Braintrust
// captures llm_calls / token metrics. runNameThread is the live worker path.
startBraintrustNode(process.env.BRAINTRUST_API_KEY, "preview");

ensureAutoevalsInit();

const env = modelEnv();

const testCases = loadGoldenDataset<NameThreadGoldenCase>("name-thread.json");

const transcriptOf = (messages: NameThreadMessage[]): string =>
	messages.map((m) => `${m.role}: ${m.content}`).join("\n");

Eval<NameThreadTestCase, string, NameThreadTestCase>(
	evalProject("Masters Thread Naming"),
	{
		data: () =>
			testCases.map((tc) => ({
				input: tc,
				expected: tc,
				metadata: {
					id: tc.id,
					difficulty: tc.difficulty,
					category: tc.category,
					shouldBeNewChat: tc.shouldBeNewChat ?? false,
				},
			})),

		task: async (testCase) =>
			runNameThread(
				env,
				testCase.messages as NameThreadMessage[],
				generateText
			),

		scores: [
			titleFormatScorer,
			titleTopicScorer,
			async ({ output, input }) => {
				if (input.shouldBeNewChat || !canRunLlmJudge()) return null;
				try {
					const transcript = transcriptOf(
						input.messages as NameThreadMessage[]
					);
					const result = await Summary({
						model: getLlmJudgeModel(),
						input: transcript,
						output,
						expected: (input.expectedTopicKeywords ?? []).join(", ") || output,
					});
					return { name: "TopicSummary", score: result.score ?? 0 };
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					return {
						name: "TopicSummary",
						score: null,
						metadata: { error: message },
					};
				}
			},
		],
	}
);
