import type { EvalScorer } from "braintrust";

import {
	anyCourseHit,
	courseLabels,
	courseNameMatches,
} from "../helpers/courseMatch";
import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";

type ChatScorer = EvalScorer<ChatTestCase, ChatAgentOutput, ChatTestCase>;

function keywordRatio(
	haystack: string,
	keywords: string[]
): { score: number; matched: string[]; missing: string[] } {
	const lower = haystack.toLowerCase();
	const matched: string[] = [];
	const missing: string[] = [];
	for (const kw of keywords) {
		if (lower.includes(kw.toLowerCase())) matched.push(kw);
		else missing.push(kw);
	}
	return {
		score: matched.length / keywords.length,
		matched,
		missing,
	};
}

export const chatCourseHitScorer: ChatScorer = ({ output, expected }) => {
	if (!expected?.expectsRagCall) return null;

	const { anyOf } = courseLabels(expected);
	if (anyOf.length === 0) return null;

	const courses = output.ragHits.map((h) => h.courseName);
	const hit = anyCourseHit(courses, anyOf);
	return {
		name: "ChatCourseHit",
		score: hit ? 1 : 0,
		metadata: { expectedCourses: anyOf, retrieved: courses },
	};
};

export const chatKeywordRecallScorer: ChatScorer = ({ output, expected }) => {
	if (!expected?.expectsRagCall) return null;

	const keywords = expected.expectedKeywords;
	if (!keywords || keywords.length === 0) return null;

	const haystack = output.ragHitTexts.join(" ");
	const { score, matched, missing } = keywordRatio(haystack, keywords);

	return {
		name: "ChatKeywordRecall",
		score,
		metadata: { matched, missing, total: keywords.length },
	};
};

export const chatInstructorHitScorer: ChatScorer = ({ output, expected }) => {
	if (!expected?.expectsRagCall) return null;

	const want = expected.expectedInstructor?.toLowerCase();
	if (!want) return null;

	const teachers = output.ragHits.map((h) => h.teacherName.toLowerCase());
	const hit = teachers.some((t) => t.includes(want));
	return {
		name: "ChatInstructorHit",
		score: hit ? 1 : 0,
		metadata: {
			expectedInstructor: expected.expectedInstructor,
			retrieved: teachers,
		},
	};
};

export const chatTopCourseHitScorer: ChatScorer = ({ output, expected }) => {
	if (!expected?.expectsRagCall) return null;

	const { top } = courseLabels(expected);
	if (!top) return null;

	const topCourse = output.ragHits[0]?.courseName;
	if (!topCourse) {
		return {
			name: "ChatTopCourseHit",
			score: 0,
			metadata: { expectedTopCourse: top, topCourse: null },
		};
	}

	return {
		name: "ChatTopCourseHit",
		score: courseNameMatches(topCourse, top) ? 1 : 0,
		metadata: { expectedTopCourse: top, topCourse },
	};
};
