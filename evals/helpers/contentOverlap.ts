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
