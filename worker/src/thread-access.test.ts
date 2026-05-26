import { afterEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:test";
import { checkThreadAccess, extractThreadId } from "./thread-access";

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
});
