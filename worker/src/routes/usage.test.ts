import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUsage } from "./usage";
import type { Env } from "../env";

const env = {
	UPSTASH_REDIS_REST_URL: "https://redis.test",
	UPSTASH_REDIS_REST_TOKEN: "token"
} as unknown as Env;

let pipelineResults: Array<Array<{ result?: unknown }>>;

beforeEach(() => {
	pipelineResults = [];
	vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
		const next = pipelineResults.shift() ?? [{ result: 0 }, { result: -1 }];
		return new Response(JSON.stringify(next), { status: 200 });
	});
});

afterEach(() => vi.restoreAllMocks());

describe("getUsage", () => {
	it("reports an authenticated user's usage against the 20 limit", async () => {
		pipelineResults = [[{ result: "5" }, { result: -1 }]];
		const res = await getUsage(env, {
			userId: "user:abc",
			isAuthenticated: true
		});
		const body = (await res.json()) as Record<string, unknown>;
		expect(body).toMatchObject({
			userId: "abc",
			used: 5,
			remaining: 15,
			total: 20,
			resetsAt: "never"
		});
	});

	it("reports an anon user against the 10 limit and surfaces a reset date", async () => {
		pipelineResults = [[{ result: "9" }, { result: 3600 }]];
		const res = await getUsage(env, {
			userId: "anon:xyz",
			isAuthenticated: false
		});
		const body = (await res.json()) as Record<string, unknown>;
		expect(body).toMatchObject({
			userId: "anonymous",
			used: 9,
			remaining: 1,
			total: 10
		});
		expect(body.resetsAt).not.toBe("never");
	});

	it("never reports negative remaining once over the limit", async () => {
		pipelineResults = [[{ result: "25" }, { result: -1 }]];
		const res = await getUsage(env, {
			userId: "user:abc",
			isAuthenticated: true
		});
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.remaining).toBe(0);
	});

	it("returns 500 when Redis fails", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("nope", { status: 500 })
		);
		const res = await getUsage(env, {
			userId: "user:abc",
			isAuthenticated: true
		});
		expect(res.status).toBe(500);
	});
});
