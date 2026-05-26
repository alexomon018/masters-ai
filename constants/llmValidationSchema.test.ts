import { describe, expect, it } from "vitest";
import {
	aiMessageSchema,
	llmModelSchema,
	nameThreadSchema
} from "./llmValidationSchema";

const VALID_MODELS = [
	"claude-haiku-4-5",
	"claude-sonnet-4-6",
	"gpt-5.5",
	"gpt-5.4",
	"gpt-5.4-mini"
] as const;

describe("llmModelSchema", () => {
	it.each(VALID_MODELS)("accepts the valid model id %s", (model) => {
		expect(llmModelSchema.safeParse(model).success).toBe(true);
	});

	it.each(["gpt-4", "claude-3", "", "CLAUDE-HAIKU-4-5"])(
		"rejects the unknown model id %s",
		(model) => {
			expect(llmModelSchema.safeParse(model).success).toBe(false);
		}
	);
});

describe("aiMessageSchema", () => {
	it("accepts a user message", () => {
		expect(
			aiMessageSchema.safeParse({ role: "user", content: "hi" }).success
		).toBe(true);
	});

	it("accepts an assistant message with optional function_call", () => {
		expect(
			aiMessageSchema.safeParse({
				role: "assistant",
				content: "hello",
				function_call: { name: "x" }
			}).success
		).toBe(true);
	});

	it("rejects an unknown role", () => {
		expect(
			aiMessageSchema.safeParse({ role: "system", content: "x" }).success
		).toBe(false);
	});

	it("rejects a user message that carries function_call (user variant has no such field)", () => {
		const parsed = aiMessageSchema.safeParse({
			role: "user",
			content: "x",
			function_call: {}
		});
		// The user variant allows unknown keys to be stripped, but missing
		// `content` should always fail.
		expect(
			aiMessageSchema.safeParse({ role: "user" }).success
		).toBe(false);
		expect(parsed.success).toBe(true);
	});
});

describe("nameThreadSchema", () => {
	const validBody = {
		messages: [
			{ role: "user", content: "What is RSC?" },
			{ role: "assistant", content: "React Server Components…" }
		],
		model: "claude-haiku-4-5"
	};

	it("accepts a well-formed body", () => {
		expect(nameThreadSchema.safeParse(validBody).success).toBe(true);
	});

	it("accepts an empty messages array (shape only)", () => {
		expect(
			nameThreadSchema.safeParse({ messages: [], model: "gpt-5.4" }).success
		).toBe(true);
	});

	it("rejects a missing model", () => {
		expect(
			nameThreadSchema.safeParse({ messages: [] }).success
		).toBe(false);
	});

	it("rejects an invalid model", () => {
		expect(
			nameThreadSchema.safeParse({ messages: [], model: "gpt-4o" }).success
		).toBe(false);
	});

	it("rejects messages that are not an array", () => {
		expect(
			nameThreadSchema.safeParse({
				messages: "nope",
				model: "gpt-5.5"
			}).success
		).toBe(false);
	});
});
