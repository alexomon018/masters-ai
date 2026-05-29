import {
	parseRagHits,
	type ParsedRagHit,
} from "./parseRagToolResult";

type ToolResultLike = {
	toolName: string;
	output?: unknown;
};

type StepLike = {
	toolResults?: ToolResultLike[];
};

function hitsFromSteps(steps: StepLike[]): ParsedRagHit[] {
	const hits: ParsedRagHit[] = [];
	for (const step of steps) {
		for (const tr of step.toolResults ?? []) {
			if (tr.toolName !== "ragSearch") continue;
			const raw = tr.output;
			if (typeof raw === "string") {
				hits.push(...parseRagHits(raw));
			}
		}
	}
	return hits;
}

/** Hit chunk text the model actually received from ragSearch tool results. */
export function collectRagHitTextsFromSteps(steps: StepLike[]): string[] {
	return hitsFromSteps(steps).map((hit) => hit.text);
}

/** Structured hits (course, instructor, chunk text) from ragSearch tool results. */
export function collectRagHitsFromSteps(steps: StepLike[]): ParsedRagHit[] {
	return hitsFromSteps(steps);
}
