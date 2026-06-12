import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type { Env } from "./env";

export type LLMModel = "claude-haiku-4-5" | "gpt-5.4-mini";

const VALID_MODELS: ReadonlySet<LLMModel> = new Set<LLMModel>([
	"claude-haiku-4-5",
	"gpt-5.4-mini"
]);

const DEFAULT_MODEL: LLMModel = "claude-haiku-4-5";

export function parseModelLabel(label: string): LLMModel | null {
	return VALID_MODELS.has(label as LLMModel) ? (label as LLMModel) : null;
}

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
			return anthropic.languageModel(modelId);
		case "gpt-5.4-mini":
			return openai.languageModel(modelId);
		default: {
			const _exhaustive: never = modelId;
			throw new Error(`Unhandled model id: ${String(_exhaustive)}`);
		}
	}
}
