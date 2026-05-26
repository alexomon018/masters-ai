import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { currentUser, cookieGet, runLLM, redis } = vi.hoisted(() => ({
	currentUser: vi.fn(),
	cookieGet: vi.fn(),
	runLLM: vi.fn(async () => "React Server Components"),
	redis: {
		incr: vi.fn(async () => 1),
		expire: vi.fn(async () => 1),
		decr: vi.fn(async () => 0)
	}
}));

vi.mock("@clerk/nextjs/server", () => ({ currentUser: () => currentUser() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet }) }));
vi.mock("@/ai/llm", () => ({ runLLM }));
vi.mock("@/lib/redis", () => ({ default: redis }));

const makeRequest = (body: unknown) =>
	new Request("http://localhost:3000/api/name-thread", {
		method: "POST",
		body: JSON.stringify(body)
	});

const validBody = {
	messages: [{ role: "user", content: "What is RSC?" }],
	model: "claude-haiku-4-5"
};

beforeEach(() => {
	vi.clearAllMocks();
	currentUser.mockResolvedValue({ id: "user_123" });
	redis.incr.mockResolvedValue(1);
	process.env.ANON_ID_SECRET = "test-secret";
});

describe("POST /api/name-thread", () => {
	it("returns 401 when there is no Clerk user and no valid anon cookie", async () => {
		currentUser.mockResolvedValue(null);
		cookieGet.mockReturnValue(undefined);

		const res = await POST(makeRequest(validBody));
		expect(res.status).toBe(401);
	});

	it("returns 400 on an invalid body (Zod)", async () => {
		const res = await POST(makeRequest({ messages: [], model: "gpt-4o" }));
		expect(res.status).toBe(400);
	});

	it("returns 429 when the daily naming limit is exceeded", async () => {
		redis.incr.mockResolvedValue(101); // over NAME_LIMIT_PER_DAY (100)
		const res = await POST(makeRequest(validBody));
		expect(res.status).toBe(429);
		expect(redis.decr).toHaveBeenCalled();
	});

	it("returns 200 with the generated title on the happy path", async () => {
		const res = await POST(makeRequest(validBody));
		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toBe("React Server Components");
		expect(runLLM).toHaveBeenCalledOnce();
	});

	it("sets the rate-limit TTL only on the first request of the window", async () => {
		redis.incr.mockResolvedValue(1);
		await POST(makeRequest(validBody));
		expect(redis.expire).toHaveBeenCalled();

		redis.expire.mockClear();
		redis.incr.mockResolvedValue(2);
		await POST(makeRequest(validBody));
		expect(redis.expire).not.toHaveBeenCalled();
	});

	it("returns 500 when runLLM throws", async () => {
		runLLM.mockRejectedValueOnce(new Error("anthropic down"));
		const res = await POST(makeRequest(validBody));
		expect(res.status).toBe(500);
	});

	it("authenticates via a valid signed anon cookie when there is no Clerk user", async () => {
		const { signAnonId, generateRawAnonId } = await import("@/utils/anonId");
		const raw = generateRawAnonId();
		const signed = await signAnonId(raw, process.env.ANON_ID_SECRET as string);
		currentUser.mockResolvedValue(null);
		cookieGet.mockReturnValue({ value: signed });

		const res = await POST(makeRequest(validBody));
		expect(res.status).toBe(200);
	});
});
