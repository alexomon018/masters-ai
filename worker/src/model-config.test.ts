import { describe, expect, it } from "vitest";

import { getModelAgentConfig } from "./model-config";

describe("getModelAgentConfig", () => {
	it("forces a first-step tool call for gpt-5.4-mini", () => {
		expect(getModelAgentConfig("gpt-5.4-mini")).toEqual({
			forceFirstStepToolChoice: "required",
			repairToolCalls: true,
		});
	});

	it("keeps haiku on default tool routing", () => {
		expect(getModelAgentConfig("claude-haiku-4-5")).toEqual({
			repairToolCalls: false,
		});
	});
});
