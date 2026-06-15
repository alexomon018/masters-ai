import type { EvalScorer } from "braintrust";

import { groundingPrecision, overlapScore } from "../helpers/contentOverlap";
import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";

type ChatScorer = EvalScorer<ChatTestCase, ChatAgentOutput, ChatTestCase>;

// Precision this share of answer vocabulary supported by hits counts as fully
// grounded — leaves room for connective/explanatory words while still
// punishing answers stuffed with unsupported specifics.
const PRECISION_TARGET = 0.5;

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
	// Out-of-scope ("edge") cases intentionally retrieve nothing — grounding the
	// answer in hits is meaningless there and the abstention scorer owns them.
	if (expected.category === "edge") return null;

	const called = output.toolNames.includes("ragSearch");
	if (!called) {
		return {
			name: "GroundedInHits",
			score: 0,
			metadata: { reason: "ragSearch not called", ragHitCount: 0 },
		};
	}

	const hitTexts = output.ragHitTexts ?? [];
	const precision = groundingPrecision(output.text, hitTexts);
	const normalizedPrecision = Math.min(1, precision / PRECISION_TARGET);
	const keywords = expected.expectedKeywords;
	const keywordScore =
		keywords && keywords.length > 0
			? keywordRecallInHits(hitTexts, keywords)
			: 1;
	const score = Math.min(normalizedPrecision, keywordScore);

	return {
		name: "GroundedInHits",
		score,
		metadata: {
			ragHitCount: hitTexts.length,
			answerLength: output.text.length,
			precision,
			normalizedPrecision,
			// Legacy capped hit→answer recall, kept for comparison.
			overlap: overlapScore(output.text, hitTexts),
			keywordScore,
		},
	};
};
