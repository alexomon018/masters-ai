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
		score: called === shouldCall ? 1 : 0,
		metadata: { called, shouldCall, toolNames: output.toolNames },
	};
};
