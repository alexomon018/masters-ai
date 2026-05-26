import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:test";
import {
	getModel,
	parseModelLabel,
	resolveWorkerModelLabel,
	type LLMModel
} from "./providers";

const VALID: LLMModel[] = [
	"claude-haiku-4-5",
	"claude-sonnet-4-6",
	"gpt-5.5",
	"gpt-5.4",
	"gpt-5.4-mini"
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
		expect(resolveWorkerModelLabel("gpt-5.4")).toBe("gpt-5.4");
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
});
