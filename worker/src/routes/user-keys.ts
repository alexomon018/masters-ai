import { z } from "zod";
import { getDb } from "../db";
import { makeUserApiKeyRepo } from "../repository/userApiKeys";
import { decryptKey, encryptKey, lastFour } from "../crypto/keyVault";
import type { LLMProvider } from "../providers";
import type { Env } from "../env";

interface AuthedRequest {
	userId: string;
}

const JSON_HEADERS = { "content-type": "application/json" } as const;

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

const providerSchema = z.enum(["anthropic", "openai"]);

export const upsertKeyBodySchema = z.object({
	provider: providerSchema,
	apiKey: z.string().min(20).max(300)
});
export type UpsertKeyBody = z.infer<typeof upsertKeyBodySchema>;

export const deleteKeyBodySchema = z.object({
	provider: providerSchema
});
export type DeleteKeyBody = z.infer<typeof deleteKeyBodySchema>;

async function validateProviderKey(
	provider: LLMProvider,
	apiKey: string
): Promise<boolean> {
	try {
		if (provider === "anthropic") {
			const res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
				headers: {
					"x-api-key": apiKey,
					"anthropic-version": "2023-06-01"
				}
			});
			return res.ok;
		}
		const res = await fetch("https://api.openai.com/v1/models", {
			headers: { authorization: `Bearer ${apiKey}` }
		});
		return res.ok;
	} catch {
		return false;
	}
}

export async function listUserKeys(
	env: Env,
	auth: AuthedRequest
): Promise<Response> {
	const repo = makeUserApiKeyRepo(getDb(env));
	const rows = await repo.listForUser(auth.userId);
	return json(
		rows.map((r) => ({
			provider: r.provider,
			lastFour: r.lastFour,
			updatedAt: r.updatedAt
		}))
	);
}

export async function upsertUserKey(
	env: Env,
	auth: AuthedRequest,
	body: UpsertKeyBody
): Promise<Response> {
	if (!auth.userId.startsWith("user:")) {
		return json({ error: "authenticated user required" }, 403);
	}
	if (!env.KEY_ENCRYPTION_SECRET) {
		return json({ error: "server misconfigured" }, 500);
	}

	const apiKey = body.apiKey.trim();
	const valid = await validateProviderKey(body.provider, apiKey);
	if (!valid) {
		return json({ error: "The API key was rejected by the provider." }, 400);
	}

	const sealed = await encryptKey(apiKey, env.KEY_ENCRYPTION_SECRET);
	const repo = makeUserApiKeyRepo(getDb(env));
	const now = new Date();
	await repo.upsert({
		userId: auth.userId,
		provider: body.provider,
		ciphertext: sealed.ciphertext,
		iv: sealed.iv,
		lastFour: lastFour(apiKey),
		createdAt: now,
		updatedAt: now
	});

	return json({ ok: true, provider: body.provider, lastFour: lastFour(apiKey) });
}

export async function deleteUserKey(
	env: Env,
	auth: AuthedRequest,
	body: DeleteKeyBody
): Promise<Response> {
	const repo = makeUserApiKeyRepo(getDb(env));
	await repo.delete(auth.userId, body.provider);
	return new Response(null, { status: 204 });
}

// Lookup + decrypt the caller's key for a provider, or null when not connected.
export async function getDecryptedUserKey(
	env: Env,
	userId: string,
	provider: LLMProvider
): Promise<string | null> {
	if (!env.KEY_ENCRYPTION_SECRET) return null;
	const repo = makeUserApiKeyRepo(getDb(env));
	const row = await repo.get(userId, provider);
	if (!row) return null;
	return decryptKey({ ciphertext: row.ciphertext, iv: row.iv }, env.KEY_ENCRYPTION_SECRET);
}
