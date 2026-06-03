import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	nameThread,
	nameThreadBodySchema,
	sanitizeTitle
} from "./name-thread";
import type { Env } from "../env";

describe("sanitizeTitle", () => {
	it("strips markdown, special tokens and surrounding quotes", () => {
		expect(sanitizeTitle('"React Server Components"')).toBe(
			"React Server Components"
		);
		expect(sanitizeTitle("**Redux** Toolkit")).toBe("Redux Toolkit");
		expect(sanitizeTitle("<<END>> CSS Grid <FOO>")).toBe("CSS Grid");
	});

	it("collapses whitespace and truncates long titles", () => {
		expect(sanitizeTitle("a   b")).toBe("a b");
		expect(sanitizeTitle("x".repeat(50))).toHaveLength(38); // 37 chars + ellipsis
	});

	it("falls back to New Chat when empty", () => {
		expect(sanitizeTitle("   ")).toBe("New Chat");
	});
});

describe("nameThreadBodySchema", () => {
	it("accepts a valid user/assistant exchange with an optional model", () => {
		const parsed = nameThreadBodySchema.safeParse({
			messages: [
				{ role: "user", content: "hi" },
				{ role: "assistant", content: "hello" }
			],
			model: "claude-haiku-4-5"
		});
		expect(parsed.success).toBe(true);
	});

	it("rejects an unknown role", () => {
		const parsed = nameThreadBodySchema.safeParse({
			messages: [{ role: "system", content: "x" }]
		});
		expect(parsed.success).toBe(false);
	});
});

describe("nameThread rate limiting", () => {
	beforeEach(() => {
		vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
			// INCR returns 101 -> over the 100/day cap; second call is the DECR.
			new Response(JSON.stringify([{ result: 101 }, { result: 1 }]), {
				status: 200
			})
		);
	});

	afterEach(() => vi.restoreAllMocks());

	it("returns 429 once the daily naming cap is exceeded", async () => {
		const env = {
			UPSTASH_REDIS_REST_URL: "https://redis.test",
			UPSTASH_REDIS_REST_TOKEN: "token"
		} as unknown as Env;

		const res = await nameThread(
			env,
			{ userId: "anon:x" },
			{ messages: [{ role: "user", content: "hi" }] }
		);
		expect(res.status).toBe(429);
	});
});
