import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkAndIncrementQuota } from "./quota";

const env = {
	UPSTASH_REDIS_REST_URL: "https://redis.test",
	UPSTASH_REDIS_REST_TOKEN: "token"
};

let pipelineResults: Array<Array<{ result?: unknown }>>;

beforeEach(() => {
	pipelineResults = [];
	vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
		const next = pipelineResults.shift() ?? [{ result: 0 }];
		return new Response(JSON.stringify(next), { status: 200 });
	});
});

afterEach(() => vi.restoreAllMocks());

describe("checkAndIncrementQuota", () => {
	it("allows when the incremented count is under the anon limit (10)", async () => {
		pipelineResults = [[{ result: 1 }, { result: 1 }]];
		const res = await checkAndIncrementQuota(env, "anon:x", false);
		expect(res.allowed).toBe(true);
	});

	it("allows an authenticated user up to 20", async () => {
		pipelineResults = [[{ result: 20 }, { result: 1 }]];
		const res = await checkAndIncrementQuota(env, "user:x", true);
		expect(res.allowed).toBe(true);
	});

	it("denies an anon user once the count passes 10 and decrements back", async () => {
		pipelineResults = [
			[{ result: 11 }, { result: 1 }],
			[{ result: 10 }]
		];
		const res = await checkAndIncrementQuota(env, "anon:x", false);
		expect(res.allowed).toBe(false);
		expect(res.reason).toContain("10");
		expect(globalThis.fetch).toHaveBeenCalledTimes(2);
	});

	it("denies an authenticated user once the count passes 20", async () => {
		pipelineResults = [[{ result: 21 }, { result: 1 }], [{ result: 20 }]];
		const res = await checkAndIncrementQuota(env, "user:x", true);
		expect(res.allowed).toBe(false);
		expect(res.reason).toContain("20");
	});

	it("throws when the Redis pipeline call fails", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("nope", { status: 500 })
		);
		await expect(
			checkAndIncrementQuota(env, "anon:x", false)
		).rejects.toThrow();
	});
});
