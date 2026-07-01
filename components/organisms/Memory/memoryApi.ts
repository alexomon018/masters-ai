import {
	buildAuthQueryParams,
	workerHttpBase
} from "@/components/organisms/Chat/helpers/agentAuth";

export type MemoryType = "preference" | "fact" | "episode";

export interface MemoryItemDto {
	id: string;
	type: MemoryType;
	key: string | null;
	content: string;
	source: "user_stated" | "inferred" | "admin_set";
	confidence: number;
	status: "active" | "provisional" | "revoked" | "superseded";
	createdAt: number;
	updatedAt: number;
}

export interface MemoryDto {
	preferences: MemoryItemDto[];
	facts: MemoryItemDto[];
	episodes: MemoryItemDto[];
}

const EMPTY: MemoryDto = { preferences: [], facts: [], episodes: [] };

export async function fetchMemory(
	getToken: () => Promise<string | null>
): Promise<MemoryDto> {
	const base = workerHttpBase();
	if (!base) return EMPTY;
	const params = await buildAuthQueryParams(getToken);
	const res = await fetch(`${base}/memory?${params.toString()}`);
	if (!res.ok) {
		throw new Error(`Failed to fetch memory (${res.status})`);
	}
	return (await res.json()) as MemoryDto;
}

export async function deleteMemoryItem(
	getToken: () => Promise<string | null>,
	memoryId: string
): Promise<boolean> {
	const base = workerHttpBase();
	if (!base) return false;
	const params = await buildAuthQueryParams(getToken);
	try {
		const res = await fetch(
			`${base}/memory/${encodeURIComponent(memoryId)}?${params.toString()}`,
			{ method: "DELETE" }
		);
		return res.ok;
	} catch {
		return false;
	}
}

export async function clearAllMemory(
	getToken: () => Promise<string | null>
): Promise<boolean> {
	const base = workerHttpBase();
	if (!base) return false;
	const params = await buildAuthQueryParams(getToken);
	try {
		const res = await fetch(`${base}/memory?${params.toString()}`, {
			method: "DELETE"
		});
		return res.ok;
	} catch {
		return false;
	}
}
