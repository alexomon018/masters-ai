import type { EvalScorer } from "braintrust";
import type { RagHit } from "../../worker/src/tools/rag-search";
import type { RagTestCase } from "../types";

type RagScorer = EvalScorer<RagTestCase, RagHit[], RagTestCase>;

export const hasResultsScorer: RagScorer = ({ output }) => ({
	name: "HasResults",
	score: output.length > 0 ? 1 : 0,
	metadata: { hitCount: output.length },
});

export const courseHitScorer: RagScorer = ({ output, expected }) => {
	const want = expected?.expectedCourse?.toLowerCase();
	if (!want) return null;

	const courses = output.map((h) => h.courseName.toLowerCase());
	const hit = courses.some((c) => c.includes(want));
	return {
		name: "CourseHit",
		score: hit ? 1 : 0,
		metadata: { expectedCourse: expected!.expectedCourse, retrieved: courses },
	};
};

export const instructorHitScorer: RagScorer = ({ output, expected }) => {
	const want = expected?.expectedInstructor?.toLowerCase();
	if (!want) return null;

	const teachers = output.map((h) => h.teacherName.toLowerCase());
	const hit = teachers.some((t) => t.includes(want));
	return {
		name: "InstructorHit",
		score: hit ? 1 : 0,
		metadata: {
			expectedInstructor: expected!.expectedInstructor,
			retrieved: teachers,
		},
	};
};

export const keywordRecallScorer: RagScorer = ({ output, expected }) => {
	const keywords = expected?.expectedKeywords;
	if (!keywords || keywords.length === 0) return null;

	const haystack = output.map((h) => h.text).join(" ").toLowerCase();
	const matched: string[] = [];
	const missing: string[] = [];
	for (const kw of keywords) {
		if (haystack.includes(kw.toLowerCase())) matched.push(kw);
		else missing.push(kw);
	}

	return {
		name: "KeywordRecall",
		score: matched.length / keywords.length,
		metadata: { matched, missing, total: keywords.length },
	};
};
