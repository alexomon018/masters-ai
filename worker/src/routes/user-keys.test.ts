import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:test";
import {
	deleteKeyBodySchema,
	deleteUserKey,
	getDecryptedUserKey,
	listUserKeys,
	upsertKeyBodySchema,
	upsertUserKey
} from "./user-keys";

function stubProviderFetch(ok: boolean) {
	vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
		new Response(ok ? "{}" : "unauthorized", { status: ok ? 200 : 401 })
	);
}

describe("upsertKeyBodySchema", () => {
	it("accepts a valid provider + key", () => {
		const parsed = upsertKeyBodySchema.safeParse({
			provider: "anthropic",
			apiKey: "sk-ant-1234567890abcdef1234"
		});
		expect(parsed.success).toBe(true);
	});

	it("rejects an unknown provider", () => {
		expect(
			upsertKeyBodySchema.safeParse({ provider: "cohere", apiKey: "x".repeat(40) })
				.success
		).toBe(false);
	});

	it("rejects a too-short key", () => {
		expect(
			upsertKeyBodySchema.safeParse({ provider: "openai", apiKey: "short" })
				.success
		).toBe(false);
	});
});

describe("deleteKeyBodySchema", () => {
	it("requires a known provider", () => {
		expect(deleteKeyBodySchema.safeParse({ provider: "openai" }).success).toBe(
			true
		);
		expect(deleteKeyBodySchema.safeParse({ provider: "nope" }).success).toBe(
			false
		);
	});
});

describe("user-keys route", () => {
	afterEach(async () => {
		vi.restoreAllMocks();
		await env.THREAD_INDEX.prepare("DELETE FROM user_api_keys").run();
	});

	it("stores an encrypted key and exposes only last four", async () => {
		stubProviderFetch(true);
		const apiKey = "sk-ant-abcdefghijklmnop4242";
		const res = await upsertUserKey(
			env,
			{ userId: "user:a" },
			{ provider: "anthropic", apiKey }
		);
		expect(res.status).toBe(200);

		const { results } = await env.THREAD_INDEX.prepare(
			"SELECT ciphertext, last_four FROM user_api_keys WHERE user_id = ?"
		)
			.bind("user:a")
			.all();
		expect(results).toHaveLength(1);
		const row = results[0] as { ciphertext: string; last_four: string };
		expect(row.ciphertext).not.toContain(apiKey);
		expect(row.last_four).toBe("4242");
	});

	it("rejects a key the provider does not accept", async () => {
		stubProviderFetch(false);
		const res = await upsertUserKey(
			env,
			{ userId: "user:a" },
			{ provider: "openai", apiKey: "sk-bad-000000000000000000" }
		);
		expect(res.status).toBe(400);

		const { results } = await env.THREAD_INDEX.prepare(
			"SELECT * FROM user_api_keys WHERE user_id = ?"
		)
			.bind("user:a")
			.all();
		expect(results).toEqual([]);
	});

	it("refuses an anonymous caller", async () => {
		stubProviderFetch(true);
		const res = await upsertUserKey(
			env,
			{ userId: "anon:x" },
			{ provider: "anthropic", apiKey: "sk-ant-1234567890abcdef1234" }
		);
		expect(res.status).toBe(401);
	});

	it("lists connected providers without leaking the key", async () => {
		stubProviderFetch(true);
		await upsertUserKey(
			env,
			{ userId: "user:a" },
			{ provider: "anthropic", apiKey: "sk-ant-1234567890abcdef9999" }
		);
		const res = await listUserKeys(env, { userId: "user:a" });
		const body = (await res.json()) as Array<Record<string, unknown>>;
		expect(body).toHaveLength(1);
		expect(body[0]).toMatchObject({ provider: "anthropic", lastFour: "9999" });
		expect(JSON.stringify(body)).not.toContain("ciphertext");
	});

	it("decrypts a stored key for the agent gate", async () => {
		stubProviderFetch(true);
		const apiKey = "sk-ant-roundtrip000000001111";
		await upsertUserKey(
			env,
			{ userId: "user:a" },
			{ provider: "anthropic", apiKey }
		);
		const decrypted = await getDecryptedUserKey(env, "user:a", "anthropic");
		expect(decrypted).toBe(apiKey);
	});

	it("returns null when no key is connected", async () => {
		const decrypted = await getDecryptedUserKey(env, "user:a", "openai");
		expect(decrypted).toBeNull();
	});

	it("disconnects a key", async () => {
		stubProviderFetch(true);
		await upsertUserKey(
			env,
			{ userId: "user:a" },
			{ provider: "openai", apiKey: "sk-openai-1234567890abcdef" }
		);
		const res = await deleteUserKey(env, { userId: "user:a" }, { provider: "openai" });
		expect(res.status).toBe(204);
		const decrypted = await getDecryptedUserKey(env, "user:a", "openai");
		expect(decrypted).toBeNull();
	});
});
