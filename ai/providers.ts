import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { LLMModel } from "@/types";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export function getModel(modelId: LLMModel): LanguageModel {
	switch (modelId) {
		case "claude-3-haiku-20240307":
		case "claude-3-5-sonnet-latest":
			return anthropic.languageModel(modelId);
		case "gpt-4o-mini":
		case "gpt-4o":
		case "gpt-3.5-turbo":
			return openai.languageModel(modelId);
		case "grok-2-latest":
			return openai.languageModel(modelId);
		default:
			return openai.languageModel("gpt-4o-mini");
	}
}
