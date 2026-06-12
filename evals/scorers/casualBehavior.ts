import type { EvalScorer } from "braintrust";
import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";

export const casualBehaviorScorer: EvalScorer<
	ChatTestCase,
	ChatAgentOutput,
	ChatTestCase
> = ({ output, expected }) => {
	if (expected?.expectsRagCall !== false) return null;

	const ragCalled = output.toolNames.includes("ragSearch");
	const ok = !ragCalled;

	return {
		name: "CasualBehavior",
		score: ok ? 1 : 0,
		metadata: {
			casual: output.casual,
			ragCalled,
			toolNames: output.toolNames,
		},
	};
};
