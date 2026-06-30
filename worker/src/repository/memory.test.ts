import { afterEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../db";
import { makeMemoryRepo } from "./memory";

const repo = () => makeMemoryRepo(getDb(env));

afterEach(async () => {
	await env.THREAD_INDEX.prepare("DELETE FROM user_memory").run();
});

describe("memory repository promotion", () => {
	it("writes a high-confidence fact as active and lists it", async () => {
		const result = await repo().promote("user:a", {
			type: "fact",
			content: "Is building a Next.js e-commerce app",
			confidence: 0.95,
			sourceThreadId: "t1"
		});
		expect(result.outcome).toBe("written");

		const active = await repo().listActive("user:a");
		expect(active).toHaveLength(1);
		expect(active[0].content).toBe("Is building a Next.js e-commerce app");
	});

	it("dedupes the same assertion seen twice", async () => {
		const first = await repo().promote("user:a", {
			type: "fact",
			content: "Prefers functional programming",
			confidence: 0.9,
			sourceThreadId: "t1"
		});
		const second = await repo().promote("user:a", {
			type: "fact",
			content: "prefers   functional programming",
			confidence: 0.9,
			sourceThreadId: "t2"
		});
		expect(first.outcome).toBe("written");
		expect(second.outcome).toBe("deduplicated");
		const active = await repo().listActive("user:a");
		expect(active).toHaveLength(1);
	});

	it("withholds a provisional fact from listActive until confirmed", async () => {
		const first = await repo().promote("user:a", {
			type: "fact",
			content: "Might be learning Rust",
			confidence: 0.7,
			sourceThreadId: "t1"
		});
		expect(first).toMatchObject({ outcome: "written", status: "provisional" });
		expect(await repo().listActive("user:a")).toHaveLength(0);
		// Visible to the transparency view even while provisional.
		expect(await repo().listVisible("user:a")).toHaveLength(1);

		const second = await repo().promote("user:a", {
			type: "fact",
			content: "Might be learning Rust",
			confidence: 0.7,
			sourceThreadId: "t2"
		});
		expect(second.outcome).toBe("confirmed");
		expect(await repo().listActive("user:a")).toHaveLength(1);
	});

	it("supersedes a preference when its value changes", async () => {
		await repo().promote("user:a", {
			type: "preference",
			key: "response_format",
			content: "markdown",
			source: "user_stated"
		});
		await repo().promote("user:a", {
			type: "preference",
			key: "response_format",
			content: "json",
			source: "user_stated"
		});
		const active = await repo().listActive("user:a");
		const prefs = active.filter((r) => r.type === "preference");
		expect(prefs).toHaveLength(1);
		expect(prefs[0].content).toBe("json");
	});

	it("scopes memory per user", async () => {
		await repo().promote("user:a", {
			type: "fact",
			content: "Is a designer",
			confidence: 0.9,
			sourceThreadId: "t1"
		});
		expect(await repo().listActive("user:b")).toHaveLength(0);
	});

	it("rejects a candidate that fails the gate without writing", async () => {
		const result = await repo().promote("user:a", {
			type: "fact",
			content: "weak guess",
			confidence: 0.3,
			sourceThreadId: "t1"
		});
		expect(result.outcome).toBe("rejected");
		expect(await repo().listVisible("user:a")).toHaveLength(0);
	});

	it("deletes a single item and all items for a user", async () => {
		const written = await repo().promote("user:a", {
			type: "fact",
			content: "Uses VS Code",
			confidence: 0.9,
			sourceThreadId: "t1"
		});
		const memoryId = written.outcome === "written" ? written.memoryId : "";
		expect(await repo().deleteOne("user:a", memoryId)).toBe(true);
		expect(await repo().deleteOne("user:a", memoryId)).toBe(false);

		await repo().promote("user:a", {
			type: "fact",
			content: "Uses macOS",
			confidence: 0.9,
			sourceThreadId: "t1"
		});
		expect(await repo().deleteAllForUser("user:a")).toBe(1);
		expect(await repo().listVisible("user:a")).toHaveLength(0);
	});
});
