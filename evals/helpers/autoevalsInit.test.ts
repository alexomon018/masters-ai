import { afterEach, describe, expect, it, vi } from "vitest";

describe("autoevalsInit", () => {
	const env = process.env;

	afterEach(() => {
		process.env = { ...env };
		vi.resetModules();
	});

	it("requires EVAL_LLM_JUDGE=1 and the provider API key", async () => {
		process.env = {
			...env,
			EVAL_LLM_JUDGE: undefined,
			EVAL_LLM_JUDGE_PROVIDER: "anthropic",
			ANTHROPIC_API_KEY: "sk-ant-test",
		};
		const mod = await import("./autoevalsInit");
		expect(mod.canRunLlmJudge()).toBe(false);

		process.env.EVAL_LLM_JUDGE = "1";
		vi.resetModules();
		const enabled = await import("./autoevalsInit");
		expect(enabled.canRunLlmJudge()).toBe(true);
	});

	it("defaults to anthropic and claude-haiku-4-5", async () => {
		process.env = {
			...env,
			EVAL_LLM_JUDGE: "1",
			EVAL_LLM_JUDGE_PROVIDER: undefined,
			EVAL_LLM_JUDGE_MODEL: undefined,
			ANTHROPIC_API_KEY: "sk-ant-test",
		};
		const mod = await import("./autoevalsInit");
		expect(mod.getLlmJudgeProvider()).toBe("anthropic");
		expect(mod.getLlmJudgeModel()).toBe("claude-haiku-4-5");
	});

	it("supports openai provider with gpt-4o-mini default", async () => {
		process.env = {
			...env,
			EVAL_LLM_JUDGE: "1",
			EVAL_LLM_JUDGE_PROVIDER: "openai",
			EVAL_LLM_JUDGE_MODEL: undefined,
			OPENAI_API_KEY: "sk-openai-test",
		};
		const mod = await import("./autoevalsInit");
		expect(mod.getLlmJudgeProvider()).toBe("openai");
		expect(mod.canRunLlmJudge()).toBe(true);
		expect(mod.getLlmJudgeModel()).toBe("gpt-4o-mini");
	});

	it("uses EVAL_LLM_JUDGE_MODEL when set", async () => {
		process.env = {
			...env,
			EVAL_LLM_JUDGE: "1",
			EVAL_LLM_JUDGE_PROVIDER: "openai",
			EVAL_LLM_JUDGE_MODEL: "gpt-5.4-mini",
			OPENAI_API_KEY: "sk-openai-test",
		};
		const mod = await import("./autoevalsInit");
		expect(mod.getLlmJudgeModel()).toBe("gpt-5.4-mini");
	});
});
