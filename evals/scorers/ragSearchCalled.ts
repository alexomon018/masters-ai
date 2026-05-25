// Did the agent call the ragSearch tool when it should have? Validates the
// CASUAL_PATTERN short-circuit in worker/src/agent-core.ts: technical questions
// must trigger a RAG call; greetings/thanks must not (so we don't burn a vector
// query on "hi").

import type { EvalScorer } from "braintrust";
import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";

export const ragSearchCalledScorer: EvalScorer<
	ChatTestCase,
	ChatAgentOutput,
	ChatTestCase
> = ({ output, expected }) => {
	const called = output.toolNames.includes("ragSearch");
	const shouldCall = expected?.expectsRagCall ?? false;

	return {
		name: "RagSearchCalled",
		// Score 1 when behavior matches expectation in either direction.
		score: called === shouldCall ? 1 : 0,
		metadata: { called, shouldCall, toolNames: output.toolNames },
	};
};
