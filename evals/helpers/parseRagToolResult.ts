export interface ParsedRagHit {
	courseName: string;
	teacherName: string;
	text: string;
}

const HIT_HEADER =
	/^\[Course: (.+?) \| Instructor: (.+?) \| Timestamp: .+? \| Score: .+?\]\n/s;

function isNoResults(toolOutput: string): boolean {
	return (
		!toolOutput ||
		toolOutput.includes("No relevant content found in the Frontend Masters")
	);
}

function parseHitBlock(block: string): ParsedRagHit | null {
	const trimmed = block.trim();
	if (!trimmed) return null;

	const match = trimmed.match(HIT_HEADER);
	if (!match) {
		return { courseName: "", teacherName: "", text: trimmed };
	}

	return {
		courseName: match[1].trim(),
		teacherName: match[2].trim(),
		text: trimmed.slice(match[0].length).trim(),
	};
}

/** Structured hits from a ragSearch tool result (formatRagHits output). */
export function parseRagHits(toolOutput: string): ParsedRagHit[] {
	if (isNoResults(toolOutput)) return [];

	return toolOutput
		.split(/\n\n---\n\n/)
		.map(parseHitBlock)
		.filter((hit): hit is ParsedRagHit => hit !== null && hit.text.length > 0);
}

/** Text chunks from a ragSearch tool result (formatRagHits output). */
export function parseRagToolResult(toolOutput: string): string[] {
	return parseRagHits(toolOutput).map((hit) => hit.text);
}
