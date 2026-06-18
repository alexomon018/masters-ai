import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type { Env } from "./env";

export type LLMModel =
	| "claude-haiku-4-5"
	| "gpt-5.4-mini"
	| "claude-opus-4-8"
	| "gpt-5.4";

export type LLMProvider = "anthropic" | "openai";

const MODEL_PROVIDER: Record<LLMModel, LLMProvider> = {
	"claude-haiku-4-5": "anthropic",
	"gpt-5.4-mini": "openai",
	"claude-opus-4-8": "anthropic",
	"gpt-5.4": "openai"
};

const BYOK_ONLY_MODELS: ReadonlySet<LLMModel> = new Set<LLMModel>([
	"claude-opus-4-8",
	"gpt-5.4"
]);

const VALID_MODELS: ReadonlySet<LLMModel> = new Set<LLMModel>(
	Object.keys(MODEL_PROVIDER) as LLMModel[]
);

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

export function modelProvider(modelId: LLMModel): LLMProvider {
	return MODEL_PROVIDER[modelId];
}

export function isByokOnlyModel(modelId: LLMModel): boolean {
	return BYOK_ONLY_MODELS.has(modelId);
}

export function getModel(
	modelId: LLMModel,
	env: Env,
	overrideKey?: string
): LanguageModel {
	const provider = MODEL_PROVIDER[modelId];

	if (provider === "anthropic") {
		const anthropic = createAnthropic({
			apiKey: overrideKey ?? env.ANTHROPIC_API_KEY
		});
		return anthropic.languageModel(modelId);
	}

	const openai = createOpenAI({ apiKey: overrideKey ?? env.OPENAI_API_KEY });
	return openai.languageModel(modelId);
}
