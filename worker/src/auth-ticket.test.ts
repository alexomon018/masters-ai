import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueTicket, redeemTicket } from "./auth-ticket";

// Full mint+redeem is covered by yarn worker:smoke — workerd can't mock @clerk/backend.

const env = {
	CLERK_SECRET_KEY: "clerk-secret",
	UPSTASH_REDIS_REST_URL: "https://redis.test",
	UPSTASH_REDIS_REST_TOKEN: "token"
} as unknown as Parameters<typeof issueTicket>[0];

let pipelineResults: Array<Array<{ result?: unknown }>>;

beforeEach(() => {
	pipelineResults = [];
	vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
		const next = pipelineResults.shift() ?? [{ result: "OK" }];
		return new Response(JSON.stringify(next), { status: 200 });
	});
});

afterEach(() => vi.restoreAllMocks());

describe("issueTicket — rejections", () => {
	it("returns null without a Bearer header", async () => {
		await expect(issueTicket(env, null)).resolves.toBeNull();
		await expect(issueTicket(env, "Basic xyz")).resolves.toBeNull();
		await expect(issueTicket(env, "Bearer ")).resolves.toBeNull();
	});

	it("returns null when CLERK_SECRET_KEY is unset", async () => {
		const noKeyEnv = { ...env, CLERK_SECRET_KEY: "" } as never;
		await expect(issueTicket(noKeyEnv, "Bearer some.jwt.token")).resolves.toBeNull();
	});

	it("returns null when the token fails verification (malformed JWT)", async () => {
		await expect(issueTicket(env, "Bearer not-a-real-jwt")).resolves.toBeNull();
	});
});

describe("redeemTicket", () => {
	it("rejects a malformed ticket without touching Redis", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		await expect(redeemTicket(env, "not-hex")).resolves.toBeNull();
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("returns the userId for a redeemable ticket", async () => {
		pipelineResults = [[{ result: "user:clerk_user_1" }]];
		const ticket = "a".repeat(64);
		await expect(redeemTicket(env, ticket)).resolves.toEqual({
			userId: "user:clerk_user_1"
		});
	});

	it("returns null when the ticket has already been consumed (GETDEL empty)", async () => {
		pipelineResults = [[{ result: null }]];
		const ticket = "b".repeat(64);
		await expect(redeemTicket(env, ticket)).resolves.toBeNull();
	});
});
