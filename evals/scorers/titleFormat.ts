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

const FALLBACK = "New Chat";

function isTitleCase(words: string[]): boolean {
	const connectors = new Set(["and", "or", "the", "of", "for", "to", "in"]);
	return words.every((w, i) => {
		if (i > 0 && connectors.has(w.toLowerCase())) return true;
		const first = w[0];
		return !/[a-z]/.test(first);
	});
}

export const titleFormatScorer: TitleScorer = ({ output, expected }) => {
	const title = output.trim();

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
