import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { DELETE } from "./route";

const WORKER = "http://localhost:8787";

const { auth, deleteUser, clerkClient, redis } = vi.hoisted(() => {
	const deleteUserFn = vi.fn(async () => {});
	return {
		auth: vi.fn(),
		deleteUser: deleteUserFn,
		clerkClient: vi.fn(async () => ({ users: { deleteUser: deleteUserFn } })),
		redis: { del: vi.fn(async () => 1) }
	};
});

vi.mock("@clerk/nextjs/server", () => ({
	auth: () => auth(),
	clerkClient: () => clerkClient()
}));
vi.mock("@/lib/redis", () => ({ default: redis }));

const signedIn = () => ({
	userId: "user_123",
	getToken: vi.fn(async () => "clerk-jwt")
});

beforeEach(() => {
	vi.clearAllMocks();
	auth.mockResolvedValue(signedIn());
	// Happy worker cascade by default.
	server.use(
		http.post(`${WORKER}/ws-ticket`, () =>
			HttpResponse.json({ ticket: "tkt" })
		),
		http.delete(`${WORKER}/users/me`, () => HttpResponse.json({ ok: true }))
	);
});

describe("DELETE /api/delete-user", () => {
	it("returns 404 when there is no signed-in user", async () => {
		auth.mockResolvedValue({ userId: null, getToken: vi.fn() });
		const res = await DELETE();
		expect(res.status).toBe(404);
		expect(deleteUser).not.toHaveBeenCalled();
	});

	it("returns 500 when no session token can be obtained", async () => {
		auth.mockResolvedValue({
			userId: "user_123",
			getToken: vi.fn(async () => null)
		});
		const res = await DELETE();
		expect(res.status).toBe(500);
		expect(deleteUser).not.toHaveBeenCalled();
	});

	it("halts before the Clerk delete when the worker cascade fails", async () => {
		server.use(
			http.post(`${WORKER}/ws-ticket`, () =>
				HttpResponse.json({}, { status: 500 })
			)
		);
		const res = await DELETE();
		expect(res.status).toBe(500);
		expect(deleteUser).not.toHaveBeenCalled();
	});

	it("deletes data, wipes quota, and removes the Clerk user on the happy path", async () => {
		const res = await DELETE();
		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({ message: "User deleted" });
		expect(redis.del).toHaveBeenCalledWith("message_count:user:user_123");
		expect(redis.del).toHaveBeenCalledWith("name_thread_count:user:user_123");
		expect(deleteUser).toHaveBeenCalledWith("user_123");
	});

	it("returns 500 when the Clerk user delete throws", async () => {
		deleteUser.mockRejectedValueOnce(new Error("clerk error"));
		const res = await DELETE();
		expect(res.status).toBe(500);
	});
});
