import type { EvalScorer } from "braintrust";

import { hasFmContext, splitSentences } from "./citation";
import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";

type ChatScorer = EvalScorer<ChatTestCase, ChatAgentOutput, ChatTestCase>;

// Phrases that signal the answer is disclaiming Frontend Masters coverage
// rather than asserting it. Tuned for the out-of-scope abstention case and
// kept local so changes here don't shift the citation scorer's own disclaimer
// handling.
const ABSTENTION_PATTERNS: RegExp[] = [
	/\b(don'?t|doesn'?t|do not|does not|didn'?t|did not)\s+(have|cover|include|contain|teach|offer)\b/i,
	/\bnot\s+(covered|included|available|part of|in\b)/i,
	/\bno\s+(relevant|specific|detailed|matching|course|courses|content|material|transcripts?)\b/i,
	/\bcouldn'?t\s+find\b/i,
	/\bcould not\s+find\b/i,
	/\b(isn'?t|aren'?t|is not|are not)\s+(in|part of|covered)\b/i,
	/\boutside\s+(the\s+)?scope\b/i,
	/\bbeyond\s+(the\s+)?(scope|frontend masters)\b/i,
	/\bnot\s+something\s+(that\s+)?frontend masters\b/i,
];

function isAbstaining(text: string): boolean {
	return ABSTENTION_PATTERNS.some((re) => re.test(text));
}

// Out-of-scope ("edge") questions are the weak-model danger zone: when
// retrieval returns nothing, a good answer abstains ("not in Frontend
// Masters") and must NOT fabricate FM coverage. This is the deterministic
// guard the suite was missing — CitationGrounding only fires once something is
// cited, and Factuality is opt-in, so without this an answer that confidently
// invents a course for an off-topic question goes unpenalized.
export const abstentionScorer: ChatScorer = ({ output, expected }) => {
	if (expected?.category !== "edge") return null;

	// Hits above threshold mean the question wasn't actually out-of-scope, so
	// citing them is legitimate; only grade abstention when retrieval was empty.
	if (output.ragHits.length > 0) return null;

	const abstained = isAbstaining(output.text);

	// A sentence that name-drops Frontend Masters without disclaiming coverage
	// is asserting FM has material on an off-topic question — i.e. fabricated.
	const fabricatedFmClaims = splitSentences(output.text).filter(
		(sentence) => hasFmContext(sentence) && !isAbstaining(sentence)
	);
	const fabricated = fabricatedFmClaims.length > 0;

	return {
		name: "Abstention",
		score: abstained && !fabricated ? 1 : 0,
		metadata: {
			abstained,
			fabricated,
			fabricatedFmClaims,
		},
	};
};
