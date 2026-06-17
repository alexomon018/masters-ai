import {
	buildAuthQueryParams,
	workerHttpBase
} from "@/components/organisms/Chat/helpers/agentAuth";

export type KeyProvider = "anthropic" | "openai";

export interface UserKeyDto {
	provider: KeyProvider;
	lastFour: string;
	updatedAt: number;
}

const workerBase = workerHttpBase;

export async function fetchUserKeys(
	getToken: () => Promise<string | null>
): Promise<UserKeyDto[]> {
	const base = workerBase();
	if (!base) return [];
	const params = await buildAuthQueryParams(getToken);
	const res = await fetch(`${base}/user-keys?${params.toString()}`);
	if (!res.ok) return [];
	return (await res.json()) as UserKeyDto[];
}

export async function saveUserKey(
	getToken: () => Promise<string | null>,
	provider: KeyProvider,
	apiKey: string
): Promise<{ ok: boolean; error?: string }> {
	const base = workerBase();
	if (!base) return { ok: false, error: "Worker not configured" };
	const params = await buildAuthQueryParams(getToken);
	const res = await fetch(`${base}/user-keys?${params.toString()}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ provider, apiKey })
	});
	if (res.ok) return { ok: true };
	const body = (await res.json().catch(() => null)) as { error?: string } | null;
	return { ok: false, error: body?.error ?? "Failed to save key" };
}

export async function deleteUserKey(
	getToken: () => Promise<string | null>,
	provider: KeyProvider
): Promise<boolean> {
	const base = workerBase();
	if (!base) return false;
	const params = await buildAuthQueryParams(getToken);
	const res = await fetch(`${base}/user-keys?${params.toString()}`, {
		method: "DELETE",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ provider })
	});
	return res.ok;
}
