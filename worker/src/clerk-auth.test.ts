import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signAnonId, generateRawAnonId } from "../../utils/anonId";
import { authenticateAgentConnection } from "./clerk-auth";

const ANON_SECRET = "test-anon-secret"; // matches worker/vitest.config miniflare binding

const env = {
	ANON_ID_SECRET: ANON_SECRET,
	UPSTASH_REDIS_REST_URL: "https://redis.test",
	UPSTASH_REDIS_REST_TOKEN: "token"
} as never;

const req = (qs: string) =>
	new Request(`https://worker.test/agents/masters-chat-agent/t1${qs}`);

let pipelineResults: Array<Array<{ result?: unknown }>>;

beforeEach(() => {
	pipelineResults = [];
	vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
		const next = pipelineResults.shift() ?? [{ result: null }];
		return new Response(JSON.stringify(next), { status: 200 });
	});
});

afterEach(() => vi.restoreAllMocks());

describe("authenticateAgentConnection", () => {
	it("resolves a ticket to an authenticated identity", async () => {
		pipelineResults = [[{ result: "user:clerk_1" }]]; // GETDEL hit
		const ticket = "c".repeat(64);
		const result = await authenticateAgentConnection(req(`?ticket=${ticket}`), env);
		expect(result).toEqual({ userId: "user:clerk_1", isAuthenticated: true });
	});

	it("rejects an unredeemable ticket", async () => {
		pipelineResults = [[{ result: null }]];
		const ticket = "d".repeat(64);
		const result = await authenticateAgentConnection(req(`?ticket=${ticket}`), env);
		expect(result).toEqual({ error: "Unauthorized" });
	});

	it("resolves a valid signed anonId to an anon identity", async () => {
		const raw = generateRawAnonId();
		const signed = await signAnonId(raw, ANON_SECRET);
		const result = await authenticateAgentConnection(
			req(`?anonId=${encodeURIComponent(signed)}`),
			env
		);
		expect(result).toEqual({ userId: `anon:${raw}`, isAuthenticated: false });
	});

	it("rejects a tampered anonId", async () => {
		const raw = generateRawAnonId();
		const signed = await signAnonId(raw, "wrong-secret");
		const result = await authenticateAgentConnection(
			req(`?anonId=${encodeURIComponent(signed)}`),
			env
		);
		expect(result).toEqual({ error: "Unauthorized" });
	});

	it("rejects a request with neither ticket nor anonId", async () => {
		const result = await authenticateAgentConnection(req(""), env);
		expect(result).toEqual({ error: "Unauthorized" });
	});
});
