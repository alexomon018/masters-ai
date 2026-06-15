import type { EvalScorer } from "braintrust";
import type { ChatTestCase } from "../types";
import type { ChatAgentOutput } from "./chatOutput";

// Verifies the agent routed to the right tool(s): every expectedTools entry was
// called and no disallowedTools entry was. Skipped (null) for cases that don't
// declare either, so it only grades routing-focused cases.
export const toolSelectionScorer: EvalScorer<
	ChatTestCase,
	ChatAgentOutput,
	ChatTestCase
> = ({ output, expected }) => {
	const expectedTools = expected?.expectedTools ?? [];
	const disallowedTools = expected?.disallowedTools ?? [];
	if (expectedTools.length === 0 && disallowedTools.length === 0) return null;

	const called = new Set(output.toolNames);
	const missing = expectedTools.filter((t) => !called.has(t));
	const forbidden = disallowedTools.filter((t) => called.has(t));

	const checks = expectedTools.length + disallowedTools.length;
	const failures = missing.length + forbidden.length;

	return {
		name: "ToolSelection",
		score: (checks - failures) / checks,
		metadata: {
			expectedTools,
			disallowedTools,
			toolNames: output.toolNames,
			missing,
			forbidden,
		},
	};
};
