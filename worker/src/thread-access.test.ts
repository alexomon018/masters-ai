import { afterEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:test";
import {
	checkThreadAccess,
	claimThread,
	extractThreadId
} from "./thread-access";

describe("extractThreadId", () => {
	it("pulls the thread id out of an agent path", () => {
		expect(
			extractThreadId("/agents/masters-chat-agent/abc-123/get-messages")
		).toBe("abc-123");
		expect(extractThreadId("/agents/masters-chat-agent/xyz")).toBe("xyz");
	});

	it("returns null for non-agent paths", () => {
		expect(extractThreadId("/threads")).toBeNull();
		expect(extractThreadId("/agents/other-agent/x")).toBeNull();
	});
});

async function seedThread(userId: string, threadId: string) {
	await env.THREAD_INDEX.prepare(
		"INSERT INTO threads (user_id, thread_id, pinned) VALUES (?, ?, 0)"
	)
		.bind(userId, threadId)
		.run();
}

afterEach(async () => {
	await env.THREAD_INDEX.prepare("DELETE FROM threads").run();
});

describe("checkThreadAccess", () => {
	it("permits an unclaimed thread (no D1 row — first-claim semantics)", async () => {
		const result = await checkThreadAccess(env, "user:a", "unclaimed-1");
		expect(result).toEqual({ ok: true });
	});

	it("permits the owner of a claimed thread", async () => {
		await seedThread("user:a", "owned-1");
		const result = await checkThreadAccess(env, "user:a", "owned-1");
		expect(result).toEqual({ ok: true });
	});

	it("denies a different user on a claimed thread", async () => {
		await seedThread("user:a", "owned-2");
		const result = await checkThreadAccess(env, "user:b", "owned-2");
		expect(result).toEqual({
			ok: false,
			status: 403,
			reason: "Thread access denied"
		});
	});

	it("denies everyone on a contested thread id (rows under two users)", async () => {
		await seedThread("user:a", "contested-1");
		await seedThread("user:b", "contested-1");
		const forA = await checkThreadAccess(env, "user:a", "contested-1");
		const forB = await checkThreadAccess(env, "user:b", "contested-1");
		expect(forA.ok).toBe(false);
		expect(forB.ok).toBe(false);
	});
});

describe("claimThread", () => {
	it("claims an unclaimed thread for the caller", async () => {
		const result = await claimThread(env, "user:a", "fresh-1");
		expect(result).toEqual({ ok: true });
		const row = await env.THREAD_INDEX.prepare(
			"SELECT user_id FROM threads WHERE thread_id = ?"
		)
			.bind("fresh-1")
			.first<{ user_id: string }>();
		expect(row?.user_id).toBe("user:a");
	});

	it("is idempotent for the owner", async () => {
		await claimThread(env, "user:a", "fresh-2");
		const again = await claimThread(env, "user:a", "fresh-2");
		expect(again).toEqual({ ok: true });
		const { results } = await env.THREAD_INDEX.prepare(
			"SELECT user_id FROM threads WHERE thread_id = ?"
		)
			.bind("fresh-2")
			.all();
		expect(results).toHaveLength(1);
	});

	it("denies a claim on a thread owned by someone else", async () => {
		await claimThread(env, "user:a", "fresh-3");
		const result = await claimThread(env, "user:b", "fresh-3");
		expect(result).toEqual({
			ok: false,
			status: 403,
			reason: "Thread access denied"
		});
		const { results } = await env.THREAD_INDEX.prepare(
			"SELECT user_id FROM threads WHERE thread_id = ?"
		)
			.bind("fresh-3")
			.all();
		expect(results).toEqual([{ user_id: "user:a" }]);
	});
});
