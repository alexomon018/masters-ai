import type { EvalScorer } from "braintrust";
import { LLMClassifierFromTemplate } from "autoevals";

import { canRunLlmJudge, getLlmJudgeModel } from "../helpers/autoevalsInit";
import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";

type ChatScorer = EvalScorer<ChatTestCase, ChatAgentOutput, ChatTestCase>;

// Turns the human-readable `expectedCharacteristics` (previously metadata-only)
// into an actual rubric for an LLM judge. Opt-in via EVAL_LLM_JUDGE=1 so the
// deterministic suite stays free; this is the cheap way to grade nuanced
// expectations ("resolves the pronoun", "doesn't drift topic") without
// hand-writing a reference answer for every case.
const RUBRIC_TEMPLATE = `You are grading an AI tutoring assistant's answer against a checklist of expected characteristics.

Conversation so far:
{{{question}}}

Assistant's answer being graded:
{{{answer}}}

Expected characteristics — a good answer should satisfy these:
{{{characteristics}}}

Considering ONLY the expected characteristics above, how many does the assistant's answer satisfy?
(a) All of them
(b) Most of them
(c) About half
(d) Only a few
(e) None of them`;

const CHOICE_SCORES = { a: 1, b: 0.75, c: 0.5, d: 0.25, e: 0 };

export const characteristicsRubricScorer: ChatScorer = async ({
	output,
	input,
}) => {
	const characteristics = input?.expectedCharacteristics ?? [];
	if (characteristics.length === 0 || !canRunLlmJudge()) return null;

	const judge = LLMClassifierFromTemplate({
		name: "Characteristics",
		promptTemplate: RUBRIC_TEMPLATE,
		choiceScores: CHOICE_SCORES,
		model: getLlmJudgeModel(),
		useCoT: true,
	});

	try {
		const result = await judge({
			output: output.text,
			question: input.messages
				.map((m) => `${m.role}: ${m.content}`)
				.join("\n"),
			answer: output.text,
			characteristics: characteristics
				.map((c, i) => `${i + 1}. ${c}`)
				.join("\n"),
		});
		return {
			name: "Characteristics",
			score: result.score ?? 0,
			metadata: { ...result.metadata, characteristics },
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { name: "Characteristics", score: null, metadata: { error: message } };
	}
};
