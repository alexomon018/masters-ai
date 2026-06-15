const STOP_WORDS = new Set([
	"about",
	"also",
	"been",
	"from",
	"have",
	"into",
	"just",
	"like",
	"more",
	"some",
	"that",
	"than",
	"their",
	"them",
	"then",
	"there",
	"these",
	"they",
	"this",
	"those",
	"very",
	"what",
	"when",
	"where",
	"which",
	"with",
	"would",
	"your",
]);

export function contentWords(text: string): Set<string> {
	const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
	const out = new Set<string>();
	for (const w of words) {
		if (!STOP_WORDS.has(w)) out.add(w);
	}
	return out;
}

/** Share of hit vocabulary (capped) that appears in the answer. */
export function overlapScore(answer: string, hitTexts: string[]): number {
	if (hitTexts.length === 0) return 0;

	const hitLexicon = contentWords(hitTexts.join(" "));
	if (hitLexicon.size === 0) return 0;

	const answerLexicon = contentWords(answer);
	let matched = 0;
	for (const w of hitLexicon) {
		if (answerLexicon.has(w)) matched += 1;
	}

	const denominator = Math.min(8, hitLexicon.size);
	return Math.min(1, matched / denominator);
}

/**
 * Share of the ANSWER's own content words that are supported by (appear in)
 * the retrieved hits. Unlike overlapScore (capped hit→answer recall, which a
 * verbose answer games by reusing any 8 hit words), this is answer→hits
 * precision: fabricated specifics that aren't in the hits drag it down, which
 * is the signal that actually catches hallucination.
 */
export function groundingPrecision(answer: string, hitTexts: string[]): number {
	if (hitTexts.length === 0) return 0;

	const answerLexicon = contentWords(answer);
	if (answerLexicon.size === 0) return 0;

	const hitLexicon = contentWords(hitTexts.join(" "));
	if (hitLexicon.size === 0) return 0;

	let supported = 0;
	for (const w of answerLexicon) {
		if (hitLexicon.has(w)) supported += 1;
	}

	return supported / answerLexicon.size;
}
