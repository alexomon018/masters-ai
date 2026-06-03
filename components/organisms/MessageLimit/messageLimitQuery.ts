import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@constants";
import {
	buildAuthQueryParams,
	workerHttpBase
} from "@/components/organisms/Chat/helpers/agentAuth";

export interface MessageLimitInfo {
	userId: string;
	used: number;
	remaining: number;
	total: number;
	resetsAt: string;
}

async function fetchMessageLimit(
	tokenFn: () => Promise<string | null>
): Promise<MessageLimitInfo> {
	const base = workerHttpBase();
	if (!base) {
		throw new Error("Worker URL is not configured");
	}
	const params = await buildAuthQueryParams(tokenFn);
	const response = await fetch(`${base}/usage?${params.toString()}`);
	if (!response.ok) {
		throw new Error("Failed to fetch message limit");
	}
	return response.json() as Promise<MessageLimitInfo>;
}

// Shared so the settings route loader and useMessageLimit hit one definition,
// keyed by queryKeys.messageLimit() (the key useQuotaInvalidation bumps).
export const messageLimitQueryOptions = (
	tokenFn: () => Promise<string | null>
) =>
	queryOptions({
		queryKey: queryKeys.messageLimit(),
		queryFn: () => fetchMessageLimit(tokenFn)
	});
