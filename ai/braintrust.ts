// Braintrust tracing for the Next.js side (the thread-naming LLM call).
//
// `wrapAISDK` patches the Vercel AI SDK so generateText is logged as a trace.
// The logger is started once at module load, guarded on the API key so the
// app runs fine without Braintrust (wrapAISDK is a no-op until a logger is
// active). Project name is set in code, not via env. On Vercel, traces flush
// in the background via waitUntil.

import * as ai from "ai";
import { initLogger, wrapAISDK } from "braintrust";

const PROD_PROJECT = "Femasters chat";
const DEV_PROJECT = "Femasters chat (dev)";

// Vercel sets VERCEL_ENV to "production" | "preview" | "development". Only
// production logs to the prod project; preview, development, and local/unset
// all log to the dev project.
export function resolveProjectName(
	environment: string | undefined = process.env.VERCEL_ENV
): string {
	return environment === "production" ? PROD_PROJECT : DEV_PROJECT;
}

if (process.env.BRAINTRUST_API_KEY) {
	initLogger({
		projectName: resolveProjectName(),
		apiKey: process.env.BRAINTRUST_API_KEY
	});
}

// Tracing-wrapped generateText — same signature as the `ai` export.
export const { generateText } = wrapAISDK(ai);
