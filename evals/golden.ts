// Golden eval cases live in evals/datasets/golden/*.json.
// Each case describes one prompt plus what a good outcome looks like.
// See evals/README.md for field conventions (aligned with ai-engineering-fundamentals).

import type { ModelMessage } from "ai";
import type { LLMModel } from "../worker/src/providers";

export type GoldenDifficulty = "simple" | "medium" | "hard" | "edge";

export type RagGoldenCategory = "domain" | "edge";
export type ChatGoldenCategory = "domain" | "routing" | "edge";
export type NameThreadGoldenCategory = "naming" | "edge";

export interface GoldenCaseBase {
	id: string;
	difficulty: GoldenDifficulty;
	expectedCharacteristics: string[];
	expectedKeywords?: string[];
}

export interface RagGoldenCase extends GoldenCaseBase {
	category: RagGoldenCategory;
	query: string;
	/** Optional metadata filters, passed to searchRagIndex like the agent would. */
	teacherName?: string;
	courseName?: string;
	/** Any top-K hit whose courseName includes one of these (slug substrings). */
	expectedCourses?: string[];
	/** Rank-1 hit should include this substring (stricter than expectedCourses). */
	expectedTopCourse?: string;
	expectedInstructor?: string;
}

export interface ChatGoldenCase extends GoldenCaseBase {
	category: ChatGoldenCategory;
	messages: { role: "user" | "assistant"; content: string }[];
	model?: LLMModel;
	expectsRagCall: boolean;
	/** Tools that MUST be called for this case (e.g. ["listCoursesByTopic"]). */
	expectedTools?: string[];
	/** Tools that must NOT be called (e.g. ["ragSearch"] for a catalog lookup). */
	disallowedTools?: string[];
	expectedCourses?: string[];
	expectedTopCourse?: string;
	expectedInstructor?: string;
	expectedAnswer?: string;
}

export interface NameThreadGoldenCase extends GoldenCaseBase {
	category: NameThreadGoldenCategory;
	messages: { role: "user" | "assistant"; content: string }[];
	expectedTopicKeywords?: string[];
	shouldBeNewChat?: boolean;
}

export const toModelMessages = (
	messages: ChatGoldenCase["messages"]
): ModelMessage[] =>
	messages.map((m) => ({ role: m.role, content: m.content })) as ModelMessage[];
