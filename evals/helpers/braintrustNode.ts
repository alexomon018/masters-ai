// Node-side Braintrust wiring for evals. Parallel to worker/src/braintrust.ts,
// which uses the `braintrust/workerd` subpath for the Cloudflare DO runtime.
// The eval runs under Node (vitest/tsx), so we need the Node entry point —
// mixing initLogger from one entry point with wrapAISDK from the other does
// not link their internal state, which is why earlier attempts left
// llm_calls / tool_calls / token metrics at zero.

import { initLogger, wrapAISDK } from "braintrust";
import * as ai from "ai";

import { resolveProjectName } from "../../worker/src/braintrust";

let started = false;

export function startBraintrustNode(
	apiKey: string | undefined,
	environment: string | undefined
): void {
	if (started || !apiKey) return;
	started = true;
	initLogger({
		projectName: resolveProjectName(environment),
		apiKey,
	});
}

export const { generateText, streamText } = wrapAISDK(ai);
