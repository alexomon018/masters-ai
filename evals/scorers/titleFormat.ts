// Title-format + topic scorers for the name-thread eval. These encode the rules
// in ai/llm.ts (nameThreadPrompt + sanitizeTitle): 2–4 words, Title Case, no
// banned generic words, no markdown/quote/angle-bracket leakage. The "New Chat"
// fallback is exempt from the format rules.

import type { EvalScorer } from "braintrust";
import type { NameThreadTestCase } from "../types";

type TitleScorer = EvalScorer<NameThreadTestCase, string, NameThreadTestCase>;

const BANNED_WORDS = [
	"chat",
	"thread",
	"conversation",
	"discussion",
	"question",
	"help",
];

// Words the prompt says never to emit. "New Chat" is the documented fallback,
// so it's allowed even though it contains a banned word.
const FALLBACK = "New Chat";

// Title Case: each word starts uppercase (allow lowercase short connectors and
// non-alpha leading chars like numbers).
function isTitleCase(words: string[]): boolean {
	const connectors = new Set(["and", "or", "the", "of", "for", "to", "in"]);
	return words.every((w, i) => {
		if (i > 0 && connectors.has(w.toLowerCase())) return true;
		const first = w[0];
		return !/[a-z]/.test(first); // first char is not lowercase
	});
}

export const titleFormatScorer: TitleScorer = ({ output, expected }) => {
	const title = output.trim();

	// The fallback is always correctly formatted by definition.
	if (expected?.shouldBeNewChat || title === FALLBACK) {
		return {
			name: "TitleFormat",
			score: title === FALLBACK ? 1 : 0,
			metadata: { title, reason: "expected New Chat fallback" },
		};
	}

	const checks: Record<string, boolean> = {};
	const words = title.split(/\s+/).filter(Boolean);

	checks.wordCount = words.length >= 2 && words.length <= 4;
	checks.noBanned = !words.some((w) =>
		BANNED_WORDS.includes(w.toLowerCase().replace(/[^a-z]/g, ""))
	);
	// sanitizeTitle strips these; their presence means leakage slipped through.
	checks.noMarkup = !/[*`"'<>]/.test(title);
	checks.titleCase = isTitleCase(words);

	const passed = Object.values(checks).filter(Boolean).length;
	const total = Object.keys(checks).length;

	return {
		name: "TitleFormat",
		score: passed / total,
		metadata: { title, checks },
	};
};

// Topic recall: does the title mention the conversation's subject? For
// shouldBeNewChat cases this is a no-op (handled by TitleFormat).
export const titleTopicScorer: TitleScorer = ({ output, expected }) => {
	if (expected?.shouldBeNewChat) return null;
	const keywords = expected?.expectedTopicKeywords;
	if (!keywords || keywords.length === 0) return null;

	const haystack = output.toLowerCase();
	const matched: string[] = [];
	const missing: string[] = [];
	for (const kw of keywords) {
		if (haystack.includes(kw.toLowerCase())) matched.push(kw);
		else missing.push(kw);
	}

	return {
		name: "TitleTopic",
		score: matched.length / keywords.length,
		metadata: { matched, missing, total: keywords.length },
	};
};
