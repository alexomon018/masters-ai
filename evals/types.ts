import type { LLMModel } from "../worker/src/providers";

export interface RagTestCase {
	id: string;
	query: string;
	expectedCourse?: string;
	expectedInstructor?: string;
	expectedKeywords?: string[];
}

export interface NameThreadTestCase {
	id: string;
	messages: { role: "user" | "assistant"; content: string }[];
	expectedTopicKeywords?: string[];
	shouldBeNewChat?: boolean;
}

export interface ChatTestCase {
	id: string;
	messages: { role: "user" | "assistant"; content: string }[];
	model?: LLMModel;
	expectsRagCall: boolean;
	expectedKeywords?: string[];
	expectedCourse?: string;
	expectedInstructor?: string;
	expectedAnswer?: string;
}
