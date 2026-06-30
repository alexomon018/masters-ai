import { afterEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../db";
import { makeMemoryRepo } from "../repository/memory";
import { signAnonId } from "../anonId";
import worker from "../worker";
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

// Exercises the public worker entrypoint (route ordering, MEMORY_ITEM_RE
// matching, auth + CORS wrapping) rather than the handler helpers in isolation.
describe("worker /memory entrypoint", () => {
	const ORIGIN = "http://localhost:3000";

	it("routes an authenticated GET /memory through auth + CORS", async () => {
		const anonId = await signAnonId("workerentrypoint01", env.ANON_ID_SECRET);
		const res = await worker.fetch(
			new Request(`https://test/memory?anonId=${encodeURIComponent(anonId)}`, {
				headers: { origin: ORIGIN }
			}),
			env
		);
		expect(res.status).toBe(200);
		expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
		const body = (await res.json()) as { preferences: unknown[] };
		expect(body).toHaveProperty("preferences");
	});

	it("rejects an unauthenticated GET /memory with 401", async () => {
		const res = await worker.fetch(new Request("https://test/memory"), env);
		expect(res.status).toBe(401);
	});

	it("matches DELETE /memory/:id and 404s an unknown id", async () => {
		const anonId = await signAnonId("workerentrypoint02", env.ANON_ID_SECRET);
		const res = await worker.fetch(
			new Request(
				`https://test/memory/does-not-exist?anonId=${encodeURIComponent(anonId)}`,
				{ method: "DELETE", headers: { origin: ORIGIN } }
			),
			env
		);
		expect(res.status).toBe(404);
	});
});
