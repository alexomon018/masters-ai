import { afterEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../db";
import { makeMemoryRepo } from "../repository/memory";
import { deleteAllMemory, deleteMemoryItem, getMemory } from "./memory";

afterEach(async () => {
	await env.THREAD_INDEX.prepare("DELETE FROM user_memory").run();
});

async function seed(userId: string) {
	const repo = makeMemoryRepo(getDb(env));
	await repo.promote(userId, {
		type: "preference",
		key: "verbosity",
		content: "terse",
		source: "user_stated"
	});
	await repo.promote(userId, {
		type: "fact",
		content: "Is building a Next.js app",
		confidence: 0.9,
		sourceThreadId: "t1"
	});
}

describe("GET /memory", () => {
	it("returns the caller's memory grouped by type", async () => {
		await seed("user:a");
		const res = await getMemory(env, { userId: "user:a" });
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			preferences: unknown[];
			facts: unknown[];
			episodes: unknown[];
		};
		expect(body.preferences).toHaveLength(1);
		expect(body.facts).toHaveLength(1);
		expect(body.episodes).toHaveLength(0);
	});

	it("does not leak another user's memory", async () => {
		await seed("user:a");
		const res = await getMemory(env, { userId: "user:b" });
		const body = (await res.json()) as { facts: unknown[] };
		expect(body.facts).toHaveLength(0);
	});
});

describe("DELETE /memory", () => {
	it("clears all memory for the caller", async () => {
		await seed("user:a");
		const res = await deleteAllMemory(env, { userId: "user:a" });
		expect(res.status).toBe(200);
		const remaining = await makeMemoryRepo(getDb(env)).listVisible("user:a");
		expect(remaining).toHaveLength(0);
	});

	it("returns 404 deleting an unknown item and 204 for a real one", async () => {
		await seed("user:a");
		const all = await makeMemoryRepo(getDb(env)).listVisible("user:a");
		const missing = await deleteMemoryItem(env, { userId: "user:a" }, "nope");
		expect(missing.status).toBe(404);
		const ok = await deleteMemoryItem(
			env,
			{ userId: "user:a" },
			all[0].memoryId
		);
		expect(ok.status).toBe(204);
	});
});
