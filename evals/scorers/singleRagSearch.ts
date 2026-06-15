import type { EvalScorer } from "braintrust";

import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";

type ChatScorer = EvalScorer<ChatTestCase, ChatAgentOutput, ChatTestCase>;

export const singleRagSearchScorer: ChatScorer = ({ output, expected }) => {
	if (!expected?.expectsSingleRagCall) return null;

	const count = output.toolNames.filter((name) => name === "ragSearch").length;

	return {
		name: "SingleRagSearch",
		score: count <= 1 ? 1 : 0,
		metadata: { count },
	};
};
