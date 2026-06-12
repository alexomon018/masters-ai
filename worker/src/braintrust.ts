import { flush, initLogger, wrapAISDK } from "braintrust/workerd";
import * as ai from "ai";

const PROD_PROJECT = "Masters AI";
const DEV_PROJECT = "Masters AI (dev)";

export function resolveProjectName(environment: string | undefined): string {
	return environment === "production" ? PROD_PROJECT : DEV_PROJECT;
}

let started = false;
let logger: ReturnType<typeof initLogger> | undefined;

export function startBraintrust(
	apiKey: string | undefined,
	environment: string | undefined
): void {
	if (started || !apiKey) return;
	started = true;
	logger = initLogger({
		projectName: resolveProjectName(environment),
		apiKey,
		// Workers have no auto-flush; agent calls flushBraintrust after each turn.
		asyncFlush: false
	});
}

export async function flushBraintrust(): Promise<void> {
	if (!logger) return;
	await logger.flush();
	await flush();
}

export const { generateText, streamText } = wrapAISDK(ai);
