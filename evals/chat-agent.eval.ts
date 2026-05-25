// End-to-end chat-agent eval. Calls the production runAgent (worker/src/
// agent-core.ts) with the real ragSearch tool against the live Upstash index,
// then scores: did it call RAG when it should (and skip it on greetings), did
// it cite the right course/instructor, did it use the right vocabulary, and —
// via LLM judge — is the answer factually aligned with a reference answer.
//
// Run with:  yarn eval:chat

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Eval } from "braintrust";
import { Factuality } from "autoevals";
import type { ModelMessage } from "ai";

import { runAgent } from "../worker/src/agent-core";
import type { LLMModel } from "../worker/src/providers";
import { model, toolEnv, evalProject } from "./helpers/env";
import type { ChatTestCase } from "./types";
import type { ChatAgentOutput } from "./scorers/chatOutput";
import { ragSearchCalledScorer } from "./scorers/ragSearchCalled";
import { citationScorer, answerKeywordScorer } from "./scorers/citation";

const testCases: ChatTestCase[] = JSON.parse(
	readFileSync(join("evals", "datasets", "chat-agent.json"), "utf-8")
);

const DEFAULT_MODEL: LLMModel = "claude-haiku-4-5";
const env = toolEnv();

const toMessages = (tc: ChatTestCase): ModelMessage[] =>
	tc.messages.map((m) => ({ role: m.role, content: m.content })) as ModelMessage[];

Eval<ChatTestCase, ChatAgentOutput, ChatTestCase>(evalProject("Masters Chat Agent"), {
	data: () =>
		testCases.map((tc) => ({
			input: tc,
			expected: tc,
			metadata: { id: tc.id, expectsRagCall: tc.expectsRagCall },
		})),

	task: async (testCase) => {
		const modelId = testCase.model ?? DEFAULT_MODEL;
		const result = await runAgent({
			model: model(modelId),
			modelLabel: modelId,
			messages: toMessages(testCase),
			env,
		});
		return {
			text: result.text,
			toolNames: result.toolCalls.map((c) => c.toolName),
			casual: result.casual,
		};
	},

	scores: [
		ragSearchCalledScorer,
		citationScorer,
		answerKeywordScorer,
		// LLM judge — answer factuality vs. the reference answer, when provided.
		async ({ output, input }) => {
			if (!input.expectedAnswer) return null;
			const result = await Factuality({
				input: input.messages.map((m) => m.content).join("\n"),
				output: output.text,
				expected: input.expectedAnswer,
			});
			return { name: "Factuality", score: result.score ?? 0 };
		},
	],
});
