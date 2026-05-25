// Shared eval setup. Reads process.env (populated by `dotenv -e .dev.vars`)
// and hands back the same building blocks the Worker uses at runtime — the
// Upstash Vector client, the ToolEnv the agent expects, and the provider's
// getModel — so evals exercise the real code paths instead of reimplementing
// them.

import { Index } from "@upstash/vector";
import type { LanguageModel } from "ai";
import { getModel, type LLMModel } from "../../worker/src/providers";
import type { Env, ToolEnv } from "../../worker/src/env";

// Eval experiments land in a per-suite Braintrust project. Off-prod runs
// (BRAINTRUST_ENV unset or not "production") get a " (dev)" suffix so local
// experimentation never pollutes the prod baselines; set BRAINTRUST_ENV=production
// (e.g. in CI) to write to the canonical project. Mirrors the runtime dev/prod
// split in ai/braintrust.ts and worker/src/braintrust.ts.
export function evalProject(baseName: string): string {
	return process.env.BRAINTRUST_ENV === "production"
		? baseName
		: `${baseName} (dev)`;
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

// The vars getModel actually reads. Cast to Env so we can reuse the real
// provider factory without standing up D1 / Durable Object bindings the eval
// never touches.
function modelEnv(): Env {
	return {
		OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
		ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
	} as Env;
}

// The Upstash credentials the ragSearch tool needs.
export function toolEnv(): ToolEnv {
	return {
		UPSTASH_VECTOR_REST_URL: required("UPSTASH_VECTOR_REST_URL"),
		UPSTASH_VECTOR_REST_TOKEN: required("UPSTASH_VECTOR_REST_TOKEN"),
	};
}

// A live Upstash Vector client over the Frontend Masters transcript index.
export function vectorClient(): Index {
	return new Index({
		url: required("UPSTASH_VECTOR_REST_URL"),
		token: required("UPSTASH_VECTOR_REST_TOKEN"),
	});
}

// Resolve an LLMModel id to a LanguageModel via the worker's own factory.
export function model(modelId: LLMModel): LanguageModel {
	return getModel(modelId, modelEnv());
}
