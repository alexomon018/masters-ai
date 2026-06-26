import { Index } from "@upstash/vector";
import type { LanguageModel } from "ai";
import { getModel, type LLMModel } from "../../worker/src/providers";
import type { Env, ToolEnv } from "../../worker/src/env";
import { resolveProjectName } from "../../worker/src/braintrust";
import { getEvalCatalogDb } from "./evalCatalogDb";

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

function vectorCreds(): { url: string; token: string } {
	const v2Url = process.env.UPSTASH_VECTOR_REST_URL_V2?.trim();
	const v2Token = process.env.UPSTASH_VECTOR_REST_TOKEN_V2?.trim();
	if (v2Url && v2Token) return { url: v2Url, token: v2Token };
	return {
		url: required("UPSTASH_VECTOR_REST_URL"),
		token: required("UPSTASH_VECTOR_REST_TOKEN")
	};
}

export function modelEnv(): Env {
	return {
		OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
		ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? ""
	} as Env;
}

let toolEnvPromise: Promise<ToolEnv> | null = null;

export async function toolEnv(): Promise<ToolEnv> {
	if (!toolEnvPromise) {
		toolEnvPromise = (async () => {
			const catalog = await getEvalCatalogDb();
			const vector = vectorCreds();
			return {
				UPSTASH_VECTOR_REST_URL: vector.url,
				UPSTASH_VECTOR_REST_TOKEN: vector.token,
				THREAD_INDEX: catalog,
				ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
				RAG_QUERY_REWRITE: process.env.RAG_QUERY_REWRITE
			};
		})().catch((err) => {
			toolEnvPromise = null;
			throw err;
		});
	}
	return toolEnvPromise;
}

export function vectorClient(): Index {
	return new Index(vectorCreds());
}

export function model(modelId: LLMModel): LanguageModel {
	return getModel(modelId, modelEnv());
}
