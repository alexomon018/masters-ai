import { afterEach, describe, expect, it, vi } from "vitest";
import { issueAnonId } from "./anon-id";
import { verifyAnonId } from "../anonId";
import type { Env } from "../env";

const SECRET = "shared-hmac-secret";
const env = { ANON_ID_SECRET: SECRET } as unknown as Env;

const redisEnv = {
	ANON_ID_SECRET: SECRET,
	UPSTASH_REDIS_REST_URL: "https://redis.test",
	UPSTASH_REDIS_REST_TOKEN: "token"
} as unknown as Env;

const mintRequest = (ip?: string) =>
	new Request("https://worker.test/anon-id", {
		headers: ip ? { "cf-connecting-ip": ip } : undefined
	});

afterEach(() => vi.restoreAllMocks());

describe("issueAnonId", () => {
	it("mints a signed anon id that the worker can verify", async () => {
		const res = await issueAnonId(env, mintRequest());
		expect(res.status).toBe(200);
		const { anonId } = (await res.json()) as { anonId: string };
		expect(anonId).toContain(".");
		await expect(verifyAnonId(anonId, SECRET)).resolves.toMatch(
			/^[A-Za-z0-9_-]{8,64}$/
		);
	});

	it("returns 503 when ANON_ID_SECRET is not configured", async () => {
		const res = await issueAnonId({} as Env, mintRequest());
		expect(res.status).toBe(503);
	});

	it("returns 429 once the per-IP daily mint cap is exceeded", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify([{ result: 21 }, { result: 1 }]), {
				status: 200
			})
		);
		const res = await issueAnonId(redisEnv, mintRequest("203.0.113.7"));
		expect(res.status).toBe(429);
	});

	it("still mints under the per-IP cap", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify([{ result: 3 }, { result: 1 }]), {
				status: 200
			})
		);
		const res = await issueAnonId(redisEnv, mintRequest("203.0.113.7"));
		expect(res.status).toBe(200);
	});

	it("fails open when Redis is unreachable", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
		const res = await issueAnonId(redisEnv, mintRequest("203.0.113.7"));
		expect(res.status).toBe(200);
	});
});
