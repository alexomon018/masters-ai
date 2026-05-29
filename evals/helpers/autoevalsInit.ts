import { init } from "autoevals";
import OpenAI from "openai";

const ANTHROPIC_OPENAI_BASE_URL = "https://api.anthropic.com/v1/";
const DEFAULT_ANTHROPIC_JUDGE_MODEL = "claude-haiku-4-5";
const DEFAULT_OPENAI_JUDGE_MODEL = "gpt-4o-mini";

export type LlmJudgeProvider = "anthropic" | "openai";

let initialized = false;

/**
 * LLM-as-judge scorers (Factuality, Summary) are opt-in only.
 * Set EVAL_LLM_JUDGE=1 in `.dev.vars` and pick a provider (see below).
 */
export function getLlmJudgeProvider(): LlmJudgeProvider {
	const raw = process.env.EVAL_LLM_JUDGE_PROVIDER?.trim().toLowerCase();
	return raw === "openai" ? "openai" : "anthropic";
}

export function canRunLlmJudge(): boolean {
	if (process.env.EVAL_LLM_JUDGE !== "1") return false;

	if (getLlmJudgeProvider() === "openai") {
		return Boolean(process.env.OPENAI_API_KEY?.trim());
	}

	return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function getLlmJudgeModel(): string {
	const override = process.env.EVAL_LLM_JUDGE_MODEL?.trim();
	if (override) return override;

	return getLlmJudgeProvider() === "openai"
		? DEFAULT_OPENAI_JUDGE_MODEL
		: DEFAULT_ANTHROPIC_JUDGE_MODEL;
}

function createJudgeClient(provider: LlmJudgeProvider): OpenAI {
	if (provider === "openai") {
		return new OpenAI({
			apiKey: process.env.OPENAI_API_KEY!.trim(),
		});
	}

	return new OpenAI({
		apiKey: process.env.ANTHROPIC_API_KEY!.trim(),
		baseURL: ANTHROPIC_OPENAI_BASE_URL,
	});
}

/**
 * Configure autoevals with an explicit client so worker keys in `.env`
 * do not hijack judge calls.
 */
export function ensureAutoevalsInit(): void {
	if (initialized) return;

	if (canRunLlmJudge()) {
		init({
			client: createJudgeClient(getLlmJudgeProvider()),
			defaultModel: getLlmJudgeModel(),
		});
	}

	initialized = true;
}
