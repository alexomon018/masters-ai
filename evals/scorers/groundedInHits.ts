import type { EvalScorer } from "braintrust";

import { overlapScore } from "../helpers/contentOverlap";
import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";

type ChatScorer = EvalScorer<ChatTestCase, ChatAgentOutput, ChatTestCase>;

function keywordRecallInHits(
	hitTexts: string[],
	keywords: string[]
): number {
	const haystack = hitTexts.join(" ").toLowerCase();
	let matched = 0;
	for (const kw of keywords) {
		if (haystack.includes(kw.toLowerCase())) matched += 1;
	}
	return matched / keywords.length;
}

export const groundedInHitsScorer: ChatScorer = ({ output, expected }) => {
	if (!expected?.expectsRagCall) return null;

	const called = output.toolNames.includes("ragSearch");
	if (!called) {
		return {
			name: "GroundedInHits",
			score: 0,
			metadata: { reason: "ragSearch not called", ragHitCount: 0 },
		};
	}

	const hitTexts = output.ragHitTexts ?? [];
	const overlap = overlapScore(output.text, hitTexts);
	const keywords = expected.expectedKeywords;
	const keywordScore =
		keywords && keywords.length > 0
			? keywordRecallInHits(hitTexts, keywords)
			: 1;
	const score = Math.min(overlap, keywordScore);

	return {
		name: "GroundedInHits",
		score,
		metadata: {
			ragHitCount: hitTexts.length,
			answerLength: output.text.length,
			overlap,
			keywordScore,
		},
	};
};
