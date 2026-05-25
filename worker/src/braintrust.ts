// Braintrust tracing for the chat agent.
//
// `wrapAISDK` patches the Vercel AI SDK so every generateText/streamText call
// (and the tool calls inside the agentic loop) is logged to Braintrust as a
// trace. The wrapped functions are re-exported and used by agent-core.ts in
// place of the raw `ai` exports.
//
// On the Workers runtime `process.env` is empty at module scope — secrets only
// arrive on the Env binding inside a request — so the logger is started lazily
// via `startBraintrust(env.BRAINTRUST_API_KEY)`. Until `initLogger` runs the
// wrapped functions are a no-op, so the worker (and the eval harness, which
// imports agent-core but never calls startBraintrust) runs fine without a key.

import { initLogger, wrapAISDK } from "braintrust";
import * as ai from "ai";

// Project names live in code (not an env var). BRAINTRUST_ENV is set per
// wrangler env (production / preview) and defaults to "development" for local
// `wrangler dev`. Only production logs to the prod project; everything else
// goes to the dev project.
const PROD_PROJECT = "Femasters chat";
const DEV_PROJECT = "Femasters chat (dev)";

export function resolveProjectName(environment: string | undefined): string {
	return environment === "production" ? PROD_PROJECT : DEV_PROJECT;
}

let started = false;

// Start the Braintrust logger once, using the API key + environment from the
// Env binding. No-ops if the key is absent (the app must run without
// Braintrust) or if already started.
export function startBraintrust(
	apiKey: string | undefined,
	environment: string | undefined
): void {
	if (started || !apiKey) return;
	started = true;
	initLogger({ projectName: resolveProjectName(environment), apiKey });
}

// Tracing-wrapped AI SDK entry points. Drop-in replacements for the `ai`
// exports of the same name.
export const { generateText, streamText } = wrapAISDK(ai);
