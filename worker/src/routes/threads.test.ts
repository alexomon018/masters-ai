import { describe, expect, it } from "vitest";
import { upsertBodySchema } from "./threads";

describe("upsertBodySchema", () => {
	it("accepts a minimal valid body", () => {
		expect(upsertBodySchema.safeParse({ threadId: "abc_123-XY" }).success).toBe(
			true
		);
	});

	it("accepts the full optional shape", () => {
		const parsed = upsertBodySchema.safeParse({
			threadId: "t1",
			title: "React Server Components",
			pinned: true,
			lastMessageAt: 1717000000000
		});
		expect(parsed.success).toBe(true);
	});

	it("allows a null title", () => {
		expect(
			upsertBodySchema.safeParse({ threadId: "t1", title: null }).success
		).toBe(true);
	});

	it("rejects a threadId with illegal characters", () => {
		expect(
			upsertBodySchema.safeParse({ threadId: "has spaces" }).success
		).toBe(false);
		expect(upsertBodySchema.safeParse({ threadId: "" }).success).toBe(false);
	});

	it("rejects a threadId longer than 64 chars", () => {
		expect(
			upsertBodySchema.safeParse({ threadId: "a".repeat(65) }).success
		).toBe(false);
	});

	it("rejects a title over 120 chars", () => {
		expect(
			upsertBodySchema.safeParse({ threadId: "t1", title: "x".repeat(121) })
				.success
		).toBe(false);
	});

	it("rejects a negative lastMessageAt", () => {
		expect(
			upsertBodySchema.safeParse({ threadId: "t1", lastMessageAt: -1 }).success
		).toBe(false);
	});
});
