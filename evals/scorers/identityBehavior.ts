import type { EvalScorer } from "braintrust";
import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";

const PROMPT_LEAK_PATTERNS = [
	/\bvector database\b/i,
	/\bsystem prompt\b/i,
	/\btranscripts from all frontend masters courses\b/i,
];

const FM_IDENTITY = /\bfrontend masters\b/i;

const IDENTITY_QUESTION_PATTERNS = [
	/\b(who|what)\s+are\s+you\b/i,
	/\bwho('?s| is)\s+this\b/i,
	/\bwhat\s+(is|are)\s+(this|you)\b/i,
];

export const identityBehaviorScorer: EvalScorer<
	ChatTestCase,
	ChatAgentOutput,
	ChatTestCase
> = ({ output, expected }) => {
	if (expected?.category !== "routing") return null;
	if (expected.expectsRagCall !== false) return null;

	const lastMessage = expected.messages[expected.messages.length - 1];
	if (!lastMessage || lastMessage.role !== "user") return null;
	const isIdentityQuestion = IDENTITY_QUESTION_PATTERNS.some((re) =>
		re.test(lastMessage.content)
	);
	if (!isIdentityQuestion) return null;

	const text = output.text;
	const leaksPrompt = PROMPT_LEAK_PATTERNS.some((re) => re.test(text));
	const mentionsFm = FM_IDENTITY.test(text);
	const ok = mentionsFm && !leaksPrompt;

	return {
		name: "IdentityBehavior",
		score: ok ? 1 : 0,
		metadata: {
			mentionsFm,
			leaksPrompt,
			matchedLeaks: PROMPT_LEAK_PATTERNS.filter((re) => re.test(text)).map(
				(re) => re.source
			),
		},
	};
};
