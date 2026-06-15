export interface ParsedRagHit {
	courseName: string;
	teacherName: string;
	text: string;
}

const SOURCE_HEADER =
	/^Source \[(\d+)\] — Course: (.+?) \| Instructor: (.+?) \| Timestamp: .+?\n/s;

const LEGACY_HEADER =
	/^\[Course: (.+?) \| Instructor: (.+?) \| Timestamp: .+? \| Score: .+?\]\n/s;

function isNoResults(toolOutput: string): boolean {
	return (
		!toolOutput ||
		toolOutput.includes("No relevant content found in the Frontend Masters")
	);
}

function stripPreamble(toolOutput: string): string {
	return toolOutput
		.replace(
			/^Answer using ONLY these transcript sources\..*?\n\n/s,
			""
		)
		.trim();
}

function parseHitBlock(block: string): ParsedRagHit | null {
	const trimmed = block.trim();
	if (!trimmed) return null;

	const sourceMatch = trimmed.match(SOURCE_HEADER);
	if (sourceMatch) {
		return {
			courseName: sourceMatch[2].trim(),
			teacherName: sourceMatch[3].trim(),
			text: trimmed.slice(sourceMatch[0].length).trim(),
		};
	}

	const legacyMatch = trimmed.match(LEGACY_HEADER);
	if (legacyMatch) {
		return {
			courseName: legacyMatch[1].trim(),
			teacherName: legacyMatch[2].trim(),
			text: trimmed.slice(legacyMatch[0].length).trim(),
		};
	}

	return { courseName: "", teacherName: "", text: trimmed };
}

/** Structured hits from a ragSearch tool result (formatRagHits output). */
export function parseRagHits(toolOutput: string): ParsedRagHit[] {
	if (isNoResults(toolOutput)) return [];

	return stripPreamble(toolOutput)
		.split(/\n\n---\n\n/)
		.map(parseHitBlock)
		.filter((hit): hit is ParsedRagHit => hit !== null && hit.text.length > 0);
}

/** Text chunks from a ragSearch tool result (formatRagHits output). */
export function parseRagToolResult(toolOutput: string): string[] {
	return parseRagHits(toolOutput).map((hit) => hit.text);
}
