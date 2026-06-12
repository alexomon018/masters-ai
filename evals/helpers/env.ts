import { Index } from "@upstash/vector";
import type { LanguageModel } from "ai";
import { getModel, type LLMModel } from "../../worker/src/providers";
import type { Env, ToolEnv } from "../../worker/src/env";
import { resolveProjectName } from "../../worker/src/braintrust";

export function evalProject(): string {
	return resolveProjectName(
		process.env.BRAINTRUST_ENV === "production" ? "production" : undefined
	);
}

function required(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			`Missing env var ${name}. Copy .dev.vars.example to .dev.vars and fill it in.`
		);
	}
	return value;
}

export function modelEnv(): Env {
	return {
		OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
		ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? ""
	} as Env;
}

export function toolEnv(): ToolEnv {
	return {
		UPSTASH_VECTOR_REST_URL: required("UPSTASH_VECTOR_REST_URL"),
		UPSTASH_VECTOR_REST_TOKEN: required("UPSTASH_VECTOR_REST_TOKEN")
	};
}

export function vectorClient(): Index {
	return new Index({
		url: required("UPSTASH_VECTOR_REST_URL"),
		token: required("UPSTASH_VECTOR_REST_TOKEN")
	});
}

export function model(modelId: LLMModel): LanguageModel {
	return getModel(modelId, modelEnv());
}
