import type { EvalScorer } from "braintrust";
import type { RagHit } from "../../worker/src/tools/rag-search";
import {
	anyCourseHit,
	courseLabels,
	courseNameMatches,
} from "../helpers/courseMatch";
import type { RagTestCase } from "../types";

type RagScorer = EvalScorer<RagTestCase, RagHit[], RagTestCase>;

export const hasResultsScorer: RagScorer = ({ output, expected }) => {
	if (expected?.category === "edge") return null;

	return {
		name: "HasResults",
		score: output.length > 0 ? 1 : 0,
		metadata: { hitCount: output.length },
	};
};

export const noResultsScorer: RagScorer = ({ output, expected }) => {
	if (expected?.category !== "edge") return null;

	return {
		name: "NoResults",
		score: output.length === 0 ? 1 : 0,
		metadata: { hitCount: output.length },
	};
};

export const topCourseHitScorer: RagScorer = ({ output, expected }) => {
	const { top } = courseLabels(expected ?? {});
	if (!top) return null;

	if (output.length === 0) {
		return {
			name: "TopCourseHit",
			score: 0,
			metadata: { expectedTopCourse: top, topCourse: null },
		};
	}

	const topCourse = output[0].courseName;
	const hit = courseNameMatches(topCourse, top);
	return {
		name: "TopCourseHit",
		score: hit ? 1 : 0,
		metadata: { expectedTopCourse: top, topCourse },
	};
};

export const top3CourseHitScorer: RagScorer = ({ output, expected }) => {
	const { anyOf, top } = courseLabels(expected ?? {});
	const labels = top ? [top, ...anyOf] : anyOf;
	const unique = [...new Set(labels)];
	if (unique.length === 0) return null;

	const top3 = output.slice(0, 3).map((h) => h.courseName);
	const hit = anyCourseHit(top3, unique);
	return {
		name: "Top3CourseHit",
		score: hit ? 1 : 0,
		metadata: { labels: unique, top3 },
	};
};

export const courseHitScorer: RagScorer = ({ output, expected }) => {
	const { anyOf } = courseLabels(expected ?? {});
	if (anyOf.length === 0) return null;

	const courses = output.map((h) => h.courseName);
	const hit = anyCourseHit(courses, anyOf);
	return {
		name: "CourseHit",
		score: hit ? 1 : 0,
		metadata: { expectedCourses: anyOf, retrieved: courses },
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
