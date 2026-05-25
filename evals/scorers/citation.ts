// Citation + keyword scorers for the chat-agent eval, run against the final
// answer text. The system prompt in agent-core.ts instructs the agent to cite
// the instructor and course it relied on; these check that it actually did and
// used the right vocabulary.

import type { EvalScorer } from "braintrust";
import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";

type ChatScorer = EvalScorer<ChatTestCase, ChatAgentOutput, ChatTestCase>;

// Expected course and/or instructor names appear in the answer. Skips cases
// that declare neither.
export const citationScorer: ChatScorer = ({ output, expected }) => {
	const wants: string[] = [];
	if (expected?.expectedCourse) wants.push(expected.expectedCourse);
	if (expected?.expectedInstructor) wants.push(expected.expectedInstructor);
	if (wants.length === 0) return null;

	const haystack = output.text.toLowerCase();
	const matched = wants.filter((w) => haystack.includes(w.toLowerCase()));

	return {
		name: "Citation",
		score: matched.length / wants.length,
		metadata: { wants, matched },
	};
};

// Fraction of expected keywords present in the answer text.
export const answerKeywordScorer: ChatScorer = ({ output, expected }) => {
	const keywords = expected?.expectedKeywords;
	if (!keywords || keywords.length === 0) return null;

	const haystack = output.text.toLowerCase();
	const matched: string[] = [];
	const missing: string[] = [];
	for (const kw of keywords) {
		if (haystack.includes(kw.toLowerCase())) matched.push(kw);
		else missing.push(kw);
	}

	return {
		name: "AnswerKeywords",
		score: matched.length / keywords.length,
		metadata: { matched, missing, total: keywords.length },
	};
};
