// Shared test-case shapes for the eval datasets. Each dataset JSON is an array
// of one of these; the eval files load them, hand each row to Braintrust as
// { input, expected, metadata }, and the scorers read the expectations off
// `expected`.

import type { LLMModel } from "../worker/src/providers";

// evals/datasets/rag-search.json
export interface RagTestCase {
	id: string;
	// The user's underlying question, rephrased as a search query (this is what
	// the agent would pass to ragSearch).
	query: string;
	// A substring expected to appear in a retrieved hit's formatted course name
	// (case-insensitive). Omit when the case only checks keyword recall.
	expectedCourse?: string;
	// A substring expected to appear in a retrieved hit's instructor name.
	expectedInstructor?: string;
	// Technical terms expected somewhere in the retrieved snippet text.
	expectedKeywords?: string[];
}

// evals/datasets/name-thread.json
export interface NameThreadTestCase {
	id: string;
	messages: { role: "user" | "assistant"; content: string }[];
	// Words/topics the generated title should contain (case-insensitive recall).
	expectedTopicKeywords?: string[];
	// When true, the input is intentionally vague and the title must be exactly
	// "New Chat" (the prompt's documented fallback).
	shouldBeNewChat?: boolean;
}

// evals/datasets/chat-agent.json
export interface ChatTestCase {
	id: string;
	messages: { role: "user" | "assistant"; content: string }[];
	model?: LLMModel;
	// Whether the agent is expected to call the ragSearch tool. Casual turns
	// (greetings/thanks) set this false to verify the CASUAL_PATTERN short-circuit.
	expectsRagCall: boolean;
	// Terms the final answer should mention.
	expectedKeywords?: string[];
	// A course/instructor name the answer should cite, when known.
	expectedCourse?: string;
	expectedInstructor?: string;
	// Reference answer for the LLM-as-judge factuality scorer.
	expectedAnswer?: string;
}
