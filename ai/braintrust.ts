import * as ai from "ai";
import { initLogger, wrapAISDK } from "braintrust";

const PROD_PROJECT = "Femasters chat";
const DEV_PROJECT = "Femasters chat (dev)";

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

export const { generateText } = wrapAISDK(ai);
