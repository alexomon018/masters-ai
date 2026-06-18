import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:test";
import {
	getModel,
	isByokOnlyModel,
	modelProvider,
	parseModelLabel,
	resolveWorkerModelLabel,
	type LLMModel
} from "./providers";

const VALID: LLMModel[] = [
	"claude-haiku-4-5",
	"gpt-5.4-mini",
	"claude-opus-4-8",
	"gpt-5.4"
];

describe("parseModelLabel", () => {
	it.each(VALID)("accepts the valid label %s", (label) => {
		expect(parseModelLabel(label)).toBe(label);
	});

	it.each(["gpt-4o", "claude-2", "", "GPT-5.5"])(
		"returns null for the unknown label %j",
		(label) => {
			expect(parseModelLabel(label)).toBeNull();
		}
	);
});

describe("resolveWorkerModelLabel", () => {
	afterEach(() => vi.restoreAllMocks());

	it("passes through a valid label", () => {
		expect(resolveWorkerModelLabel("gpt-5.4-mini")).toBe("gpt-5.4-mini");
	});

	it("falls back to claude-haiku-4-5 and warns on an unknown label", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(resolveWorkerModelLabel("bogus")).toBe("claude-haiku-4-5");
		expect(warn).toHaveBeenCalled();
	});
});

describe("getModel", () => {
	it.each(VALID)("returns a language model for %s", (modelId) => {
		const model = getModel(modelId, env);
		expect(model).toBeDefined();
	});

	it("accepts an override key for a BYOK model", () => {
		const model = getModel("claude-opus-4-8", env, "sk-ant-user-key");
		expect(model).toBeDefined();
	});
});

describe("modelProvider", () => {
	it.each([
		["claude-haiku-4-5", "anthropic"],
		["claude-opus-4-8", "anthropic"],
		["gpt-5.4-mini", "openai"],
		["gpt-5.4", "openai"]
	] as const)("maps %s to %s", (modelId, provider) => {
		expect(modelProvider(modelId)).toBe(provider);
	});
});

describe("isByokOnlyModel", () => {
	it("flags frontier models as BYOK-only", () => {
		expect(isByokOnlyModel("claude-opus-4-8")).toBe(true);
		expect(isByokOnlyModel("gpt-5.4")).toBe(true);
	});

	it("does not flag free models", () => {
		expect(isByokOnlyModel("claude-haiku-4-5")).toBe(false);
		expect(isByokOnlyModel("gpt-5.4-mini")).toBe(false);
	});
});
