import type { LLMModel } from "./providers";

export interface ModelAgentConfig {
	temperature?: number;
	// Weak models tend to answer technical questions from parametric memory
	// instead of searching. Forcing a tool call on the first non-casual step
	// fixes that. We force "required" (the model still chooses which tool)
	// rather than pinning ragSearch, so catalog-routing turns ("what React
	// courses exist?") can pick a catalog tool instead of being forced into a
	// ragSearch they're supposed to avoid.
	forceFirstStepToolChoice?: "required";
	repairToolCalls: boolean;
}

const MODEL_AGENT_CONFIG: Record<LLMModel, ModelAgentConfig> = {
	"claude-haiku-4-5": {
		repairToolCalls: false
	},
	"gpt-5.4-mini": {
		forceFirstStepToolChoice: "required",
		repairToolCalls: true
	},
	"claude-opus-4-8": {
		repairToolCalls: false
	},
	"gpt-5.4": {
		repairToolCalls: true
	}
};

export function getModelAgentConfig(modelId: LLMModel): ModelAgentConfig {
	return MODEL_AGENT_CONFIG[modelId];
}
