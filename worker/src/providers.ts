// LLM provider factory. Mirrors the model lineup declared on the client
// (constants/models.tsx + types/Model.ts) and routes each model id to the
// correct provider. Keys come off the Env binding so the same path works
// inside a Durable Object where process.env is unavailable.

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type { Env } from "./env";

export type LLMModel =
	| "claude-haiku-4-5"
	| "claude-sonnet-4-6"
	| "gpt-5.5"
	| "gpt-5.4"
	| "gpt-5.4-mini";

const VALID_MODELS: ReadonlySet<LLMModel> = new Set<LLMModel>([
	"claude-haiku-4-5",
	"claude-sonnet-4-6",
	"gpt-5.5",
	"gpt-5.4",
	"gpt-5.4-mini"
]);

const DEFAULT_MODEL: LLMModel = "claude-haiku-4-5";

// Returns `null` for unknown labels. Callers decide whether to substitute
// the default or reject the request — having that choice live at the call
// site is clearer than a silent fallback inside the factory.
export function parseModelLabel(label: string): LLMModel | null {
	return VALID_MODELS.has(label as LLMModel) ? (label as LLMModel) : null;
}

// Convenience for the common "use what the client sent, fall back to
// default on garbage" path. Logs at info-level so unknown labels are
// visible without breaking the user's turn.
export function resolveWorkerModelLabel(label: string): LLMModel {
	const parsed = parseModelLabel(label);
	if (parsed) return parsed;
	// eslint-disable-next-line no-console
	console.warn(`[providers] unknown model "${label}", using ${DEFAULT_MODEL}`);
	return DEFAULT_MODEL;
}

export function getModel(modelId: LLMModel, env: Env): LanguageModel {
	const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
	const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });

	switch (modelId) {
		case "claude-haiku-4-5":
		case "claude-sonnet-4-6":
			return anthropic.languageModel(modelId);
		case "gpt-5.5":
		case "gpt-5.4":
		case "gpt-5.4-mini":
			return openai.languageModel(modelId);
		default: {
			// Exhaustiveness check — TS will error here if a new model id
			// is added to LLMModel but not wired above.
			const _exhaustive: never = modelId;
			throw new Error(`Unhandled model id: ${String(_exhaustive)}`);
		}
	}
}
