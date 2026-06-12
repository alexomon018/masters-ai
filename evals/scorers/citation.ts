import type { EvalScorer } from "braintrust";
import {
	courseLabels,
	labelInText,
	normalizeCourseToken,
} from "../helpers/courseMatch";
import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";

type ChatScorer = EvalScorer<ChatTestCase, ChatAgentOutput, ChatTestCase>;

/** Phrases that signal the answer is disclaiming FM coverage, not citing it. */
const DISCLAIMER_PATTERNS: RegExp[] = [
	/\b(don't|doesn't|do not|does not)\s+have\b/i,
	/\bno\s+(relevant|specific|detailed)\b/i,
	/\b(search results|transcripts?)\s+don'?t\s+contain\b/i,
	/\bcouldn'?t\s+find\b/i,
	/\bnot\s+available\b/i,
	/\bisn'?t\s+in\b/i,
	/\bdon'?t\s+(have|cover)\b/i,
];

const BRAND_REGEX = /\bfrontend masters\b/i;

/**
 * Max char gap between the brand phrase and a label, used as a cross-sentence
 * proximity fallback when neither occurrence sits in the same sentence as the
 * other. Kept tight so generic brand mentions don't drag in distant topic
 * words.
 */
const PROXIMITY_GAP = 120;

export function hasFmContext(text: string): boolean {
	return BRAND_REGEX.test(text);
}

function containsDisclaimer(text: string): boolean {
	return DISCLAIMER_PATTERNS.some((re) => re.test(text));
}

function splitSentences(text: string): string[] {
	return text
		.split(/[.!?]+\s+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

function allMatches(text: string, re: RegExp): { start: number; end: number }[] {
	const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
	const cloned = new RegExp(re.source, flags);
	const out: { start: number; end: number }[] = [];
	let m: RegExpExecArray | null = cloned.exec(text);
	while (m !== null) {
		out.push({ start: m.index, end: m.index + m[0].length });
		if (m.index === cloned.lastIndex) cloned.lastIndex += 1;
		m = cloned.exec(text);
	}
	return out;
}

/**
 * Locate every word-boundary occurrence of `label` in `text` (mirrors the
 * semantics of `labelInText` but returns positions in the original text).
 *
 * `labelInText` operates on a normalized copy where punctuation collapses to
 * spaces, so we replicate that normalization while tracking a position map
 * back to the original string.
 */
function findLabelPositions(
	text: string,
	label: string
): { start: number; end: number }[] {
	const normalizedLabel = normalizeCourseToken(label)
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (normalizedLabel === "") return [];

	// Build a normalized string char-by-char while remembering each output
	// char's source index in the original text. This lets us match on the
	// normalized form and map matches back to original char ranges.
	const normChars: string[] = [];
	const sourceIdx: number[] = [];
	const lower = text.toLowerCase();
	for (let i = 0; i < lower.length; i += 1) {
		const ch = lower[i];
		const normCh = /[a-z0-9]/.test(ch) ? ch : " ";
		normChars.push(normCh);
		sourceIdx.push(i);
	}
	const normalized = normChars.join("");

	const escaped = normalizedLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const re = new RegExp(`(^|\\s)(${escaped})($|\\s)`, "g");
	const out: { start: number; end: number }[] = [];
	let m: RegExpExecArray | null = re.exec(normalized);
	while (m !== null) {
		const matchStart = m.index + m[1].length;
		const matchEnd = matchStart + m[2].length;
		out.push({
			start: sourceIdx[matchStart] ?? matchStart,
			end: (sourceIdx[matchEnd - 1] ?? matchEnd - 1) + 1,
		});
		if (m.index === re.lastIndex) re.lastIndex += 1;
		m = re.exec(normalized);
	}
	return out;
}

/**
 * True iff the answer attributes the given label to Frontend Masters:
 *   - some sentence contains BOTH the label and "frontend masters" with no
 *     disclaimer in that sentence, OR
 *   - a "frontend masters" mention and a label mention occur within
 *     PROXIMITY_GAP chars of each other (gap = distance between the two
 *     spans), AND the spanning region contains no disclaimer.
 */
export function isCitationOf(text: string, label: string): boolean {
	if (!hasFmContext(text)) return false;
	if (!labelInText(text, label)) return false;

	// 1. Sentence-level proximity (the common case).
	for (const sentence of splitSentences(text)) {
		if (
			BRAND_REGEX.test(sentence) &&
			labelInText(sentence, label) &&
			!containsDisclaimer(sentence)
		) {
			return true;
		}
	}

	// 2. Gap-based fallback for citations that straddle a sentence boundary
	//    (e.g. "Frontend Masters has a course. The Node.js v3 course by
	//    Scott Moss covers..."). We measure the distance between the brand
	//    and label spans themselves, not a fixed window around each — a
	//    distant generic "Frontend Masters" mention shouldn't drag in topic
	//    words from elsewhere in the answer.
	const brandSpans = allMatches(text, BRAND_REGEX);
	const labelSpans = findLabelPositions(text, label);
	for (const b of brandSpans) {
		for (const l of labelSpans) {
			const gap =
				l.start >= b.end
					? l.start - b.end
					: b.start >= l.end
						? b.start - l.end
						: 0;
			if (gap > PROXIMITY_GAP) continue;
			const regionStart = Math.min(b.start, l.start);
			const regionEnd = Math.max(b.end, l.end);
			const region = text.slice(regionStart, regionEnd);
			if (!containsDisclaimer(region)) return true;
		}
	}

	return false;
}

export const citationScorer: ChatScorer = ({ output, expected }) => {
	const { anyOf } = courseLabels(expected ?? {});
	const wants: string[] = [...anyOf];
	if (expected?.expectedInstructor) wants.push(expected.expectedInstructor);
	if (wants.length === 0) return null;

	const matched = wants.filter((w) => isCitationOf(output.text, w));

	return {
		name: "Citation",
		score: matched.length / wants.length,
		metadata: { wants, matched },
	};
};

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
