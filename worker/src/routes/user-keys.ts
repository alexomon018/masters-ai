import { z } from "zod";
import { tryCatch } from "../../../utils/tryCatch";
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

const providerSchema = z.enum(["anthropic", "openai"], {
	error: "Unsupported provider."
});

export const upsertKeyBodySchema = z.object({
	provider: providerSchema,
	apiKey: z
		.string({ error: "Enter an API key." })
		.trim()
		.min(20, "That key looks too short — paste the full API key.")
		.max(300, "That key is too long — check you pasted only the key.")
});
export type UpsertKeyBody = z.infer<typeof upsertKeyBodySchema>;

export const deleteKeyBodySchema = z.object({
	provider: providerSchema
});
export type DeleteKeyBody = z.infer<typeof deleteKeyBodySchema>;

type KeyValidation =
	| { status: "valid" }
	| { status: "invalid" }
	| { status: "unavailable" };

const VALIDATION_TIMEOUT_MS = 10_000;

async function validateProviderKey(
	provider: LLMProvider,
	apiKey: string
): Promise<KeyValidation> {
	const url =
		provider === "anthropic"
			? "https://api.anthropic.com/v1/models?limit=1"
			: "https://api.openai.com/v1/models";
	const headers: Record<string, string> =
		provider === "anthropic"
			? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
			: { authorization: `Bearer ${apiKey}` };

	const { data: res, error } = await tryCatch(
		fetch(url, { headers, signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS) })
	);

	if (error) {
		console.error(`[user-keys] ${provider} validation request failed:`, error);
		return { status: "unavailable" };
	}
	if (res.ok) return { status: "valid" };
	// 401/403 mean the provider rejected the key; other statuses (429, 5xx) are
	// upstream problems we shouldn't blame on the user's key.
	if (res.status === 401 || res.status === 403) return { status: "invalid" };
	console.error(
		`[user-keys] ${provider} validation returned unexpected status ${res.status}`
	);
	return { status: "unavailable" };
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
		console.warn("[user-keys] rejected upsert: authenticated user required");
		return json({ error: "Unauthorized" }, 401);
	}
	if (!env.KEY_ENCRYPTION_SECRET) {
		return json({ error: "server misconfigured" }, 500);
	}

	const apiKey = body.apiKey.trim();
	const validation = await validateProviderKey(body.provider, apiKey);
	if (validation.status === "invalid") {
		return json({ error: "The API key was rejected by the provider." }, 400);
	}
	if (validation.status === "unavailable") {
		return json(
			{ error: "Could not verify the key right now. Please try again." },
			502
		);
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
	const { data, error } = await tryCatch(
		decryptKey(
			{ ciphertext: row.ciphertext, iv: row.iv },
			env.KEY_ENCRYPTION_SECRET
		)
	);
	if (error) {
		console.error(`[user-keys] failed to decrypt ${provider} key:`, error);
		return null;
	}
	return data;
}
