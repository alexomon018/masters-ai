import { Eval } from "braintrust";
import { Factuality } from "autoevals";

import { runAgent } from "../worker/src/agent-core";
import type { LLMModel } from "../worker/src/providers";
import { startBraintrustNode, generateText, streamText } from "./helpers/braintrustNode";

const aiSdk = { generateText, streamText };
import { toModelMessages, type ChatGoldenCase } from "./golden";
import { collectRagHitsFromSteps } from "./helpers/collectRagHitTexts";
import {
	canRunLlmJudge,
	ensureAutoevalsInit,
	getLlmJudgeModel,
} from "./helpers/autoevalsInit";
import { loadGoldenDataset } from "./helpers/loadGolden";
import { model, toolEnv, evalProject } from "./helpers/env";
import type { ChatTestCase } from "./types";
import type { ChatAgentOutput } from "./scorers/chatOutput";
import { casualBehaviorScorer } from "./scorers/casualBehavior";
import {
	chatCourseHitScorer,
	chatInstructorHitScorer,
	chatKeywordRecallScorer,
	chatTopCourseHitScorer,
} from "./scorers/chatRetrieval";
import { ragSearchCalledScorer } from "./scorers/ragSearchCalled";
import { toolSelectionScorer } from "./scorers/toolSelection";
import { citationScorer, answerKeywordScorer } from "./scorers/citation";
import { groundedInHitsScorer } from "./scorers/groundedInHits";
import { identityBehaviorScorer } from "./scorers/identityBehavior";

// Initialize the Node-side Braintrust logger and use Node-wrapped AI SDK
// functions (passed into runAgent via aiSdk) so llm_calls / tool_calls /
// token metrics are captured. The DO entry point keeps using the workerd
// subpath wrappers untouched.
startBraintrustNode(process.env.BRAINTRUST_API_KEY, "preview");

ensureAutoevalsInit();

const testCases = loadGoldenDataset<ChatGoldenCase>("chat-agent.json");

const DEFAULT_MODEL: LLMModel = (process.env.EVAL_CHAT_MODEL as LLMModel) ?? "claude-haiku-4-5";
const env = toolEnv();

Eval<ChatTestCase, ChatAgentOutput, ChatTestCase>(evalProject(), {
	experimentName: "Masters Chat Agent",
	data: () =>
		testCases.map((tc) => ({
			input: tc,
			expected: tc,
			metadata: {
				id: tc.id,
				difficulty: tc.difficulty,
				category: tc.category,
				expectsRagCall: tc.expectsRagCall,
			},
		})),

	task: async (testCase) => {
		const modelId = testCase.model ?? DEFAULT_MODEL;
		const result = await runAgent({
			model: model(modelId),
			modelLabel: modelId,
			messages: toModelMessages(testCase.messages),
			env,
			aiSdk,
		});
		const ragHits = collectRagHitsFromSteps(result.steps);
		return {
			text: result.text,
			toolNames: result.toolCalls.map((c) => c.toolName),
			casual: result.casual,
			ragHitTexts: ragHits.map((hit) => hit.text),
			ragHits,
		};
	},

	scores: [
		ragSearchCalledScorer,
		toolSelectionScorer,
		casualBehaviorScorer,
		identityBehaviorScorer,
		citationScorer,
		answerKeywordScorer,
		chatCourseHitScorer,
		chatTopCourseHitScorer,
		chatInstructorHitScorer,
		chatKeywordRecallScorer,
		groundedInHitsScorer,
		async ({ output, input }) => {
			if (!input.expectedAnswer || !canRunLlmJudge()) return null;
			try {
				const result = await Factuality({
					model: getLlmJudgeModel(),
					input: input.messages.map((m) => m.content).join("\n"),
					output: output.text,
					expected: input.expectedAnswer,
				});
				return { name: "Factuality", score: result.score ?? 0 };
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				return {
					name: "Factuality",
					score: null,
					metadata: { error: message },
				};
			}
		},
	],
});
