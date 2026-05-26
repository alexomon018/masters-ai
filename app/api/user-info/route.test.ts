import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { currentUser, cookieGet, redis } = vi.hoisted(() => ({
	currentUser: vi.fn(),
	cookieGet: vi.fn(),
	redis: {
		exists: vi.fn(async () => 1),
		get: vi.fn(async () => "5"),
		ttl: vi.fn(async () => -1)
	}
}));

vi.mock("@clerk/nextjs/server", () => ({ currentUser: () => currentUser() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet }) }));
vi.mock("@/lib/redis", () => ({ default: redis }));

beforeEach(() => {
	vi.clearAllMocks();
	process.env.ANON_ID_SECRET = "test-secret";
});

describe("GET /api/user-info", () => {
	it("reports the authenticated total (20) and computed remaining", async () => {
		currentUser.mockResolvedValue({ id: "user_123" });
		redis.exists.mockResolvedValue(1);
		redis.get.mockResolvedValue("5");
		redis.ttl.mockResolvedValue(-1);

		const res = await GET();
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(body).toMatchObject({
			userId: "user_123",
			used: 5,
			total: 20,
			remaining: 15,
			resetsAt: "never"
		});
	});

	it("returns anon defaults (total 10) when there is no user and no valid cookie", async () => {
		currentUser.mockResolvedValue(null);
		cookieGet.mockReturnValue(undefined);

		const res = await GET();
		const body = await res.json();
		expect(body).toMatchObject({
			userId: "anonymous",
			used: 0,
			total: 10,
			remaining: 10,
			resetsAt: "never"
		});
	});

	it("uses the anon total (10) for a valid signed cookie", async () => {
		const { signAnonId, generateRawAnonId } = await import("@/utils/anonId");
		const raw = generateRawAnonId();
		const signed = await signAnonId(raw, "test-secret");
		currentUser.mockResolvedValue(null);
		cookieGet.mockReturnValue({ value: signed });
		redis.exists.mockResolvedValue(1);
		redis.get.mockResolvedValue("3");
		redis.ttl.mockResolvedValue(-1);

		const res = await GET();
		const body = await res.json();
		expect(body.total).toBe(10);
		expect(body.used).toBe(3);
		expect(body.remaining).toBe(7);
	});

	it("computes a resetsAt date when a TTL is present", async () => {
		currentUser.mockResolvedValue({ id: "user_123" });
		redis.exists.mockResolvedValue(1);
		redis.get.mockResolvedValue("1");
		redis.ttl.mockResolvedValue(3600);

		const res = await GET();
		const body = await res.json();
		expect(body.resetsAt).not.toBe("never");
	});

	it("clamps remaining at 0 when usage exceeds the limit", async () => {
		currentUser.mockResolvedValue({ id: "user_123" });
		redis.exists.mockResolvedValue(1);
		redis.get.mockResolvedValue("25"); // over the 20 cap
		redis.ttl.mockResolvedValue(-1);

		const res = await GET();
		const body = await res.json();
		expect(body.remaining).toBe(0);
	});

	it("returns 500 with an error when Redis throws", async () => {
		currentUser.mockResolvedValue({ id: "user_123" });
		redis.exists.mockRejectedValue(new Error("redis down"));

		const res = await GET();
		expect(res.status).toBe(500);
	});
});
