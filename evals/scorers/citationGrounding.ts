import type { EvalScorer } from "braintrust";

import {
	courseNameMatches,
	labelInText,
	normalizeCourseToken,
} from "../helpers/courseMatch";
import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";
import { isCitationOf } from "./citation";

type ChatScorer = EvalScorer<ChatTestCase, ChatAgentOutput, ChatTestCase>;

function uniqueLabels(labels: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const label of labels) {
		const trimmed = label.trim();
		if (!trimmed) continue;
		const key = normalizeCourseToken(trimmed);
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(trimmed);
	}
	return out;
}

function labelGroundedInHits(
	label: string,
	hits: ChatAgentOutput["ragHits"]
): boolean {
	return hits.some(
		(hit) =>
			courseNameMatches(hit.courseName, label) ||
			courseNameMatches(hit.teacherName, label)
	);
}

function candidateCitationLabels(
	output: ChatAgentOutput,
	expected: ChatTestCase | undefined
): string[] {
	const fromHits = output.ragHits.flatMap((hit) => [
		hit.courseName,
		hit.teacherName,
	]);
	const fromExpected = [
		...(expected?.expectedCourses ?? []),
		...(expected?.expectedInstructor ? [expected.expectedInstructor] : []),
	];
	return uniqueLabels([...fromHits, ...fromExpected]);
}

export function extractCitedLabels(
	text: string,
	candidates: string[]
): string[] {
	return candidates.filter((label) => isCitationOf(text, label));
}

export const citationGroundingScorer: ChatScorer = ({ output, expected }) => {
	if (!expected?.expectsRagCall) return null;
	if (!output.toolNames.includes("ragSearch")) return null;

	const candidates = candidateCitationLabels(output, expected);
	const cited = extractCitedLabels(output.text, candidates);
	if (cited.length === 0) return null;

	const grounded = cited.filter((label) =>
		labelGroundedInHits(label, output.ragHits)
	);
	const fabricated = cited.filter(
		(label) => !labelGroundedInHits(label, output.ragHits)
	);

	return {
		name: "CitationGrounding",
		score: grounded.length / cited.length,
		metadata: {
			cited,
			grounded,
			fabricated,
			ragHitCount: output.ragHits.length,
			hasFmContext: labelInText(output.text, "frontend masters"),
		},
	};
};
