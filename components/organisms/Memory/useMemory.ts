import { useCallback, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants";
import { useTokenFn } from "@hooks";
import { authSubject } from "@/components/organisms/Chat/helpers/agentAuth";
import {
	clearAllMemory,
	deleteMemoryItem,
	fetchMemory,
	type MemoryDto
} from "./memoryApi";

const EMPTY: MemoryDto = { preferences: [], facts: [], episodes: [] };

export const useMemory = () => {
	const tokenFn = useTokenFn();
	const queryClient = useQueryClient();
	const { user } = useUser();

	const memoryQueryKey = queryKeys.memory(authSubject(user?.id));

	const {
		data = EMPTY,
		isLoading,
		isError
	} = useQuery({
		queryKey: memoryQueryKey,
		queryFn: () => fetchMemory(tokenFn),
		// A settings panel should always reflect the latest memory when opened —
		// background extraction may have added rows since this query was last
		// cached (and the cache is persisted across reloads), so refetch on mount
		// rather than showing a stale snapshot.
		staleTime: 0,
		refetchOnMount: "always"
	});

	// Track every in-flight delete by id so overlapping forgets don't clear each
	// other's pending state — a single pendingId would let a later forget
	// re-enable an earlier row's button before its request settles.
	const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(
		() => new Set()
	);
	const [clearing, setClearing] = useState(false);

	// Both return whether the delete succeeded so the caller can keep the
	// confirm dialog open / show a per-item error on failure. Only invalidate
	// (and thus optimistically refresh) when the server actually confirmed it.
	const forget = useCallback(
		async (memoryId: string): Promise<boolean> => {
			setPendingIds((prev) => new Set(prev).add(memoryId));
			try {
				const ok = await deleteMemoryItem(tokenFn, memoryId);
				if (ok) {
					await queryClient.invalidateQueries({ queryKey: memoryQueryKey });
				}
				return ok;
			} finally {
				setPendingIds((prev) => {
					const next = new Set(prev);
					next.delete(memoryId);
					return next;
				});
			}
		},
		[tokenFn, queryClient, memoryQueryKey]
	);

	const clearAll = useCallback(async (): Promise<boolean> => {
		setClearing(true);
		try {
			const ok = await clearAllMemory(tokenFn);
			if (ok) {
				await queryClient.invalidateQueries({ queryKey: memoryQueryKey });
			}
			return ok;
		} finally {
			setClearing(false);
		}
	}, [tokenFn, queryClient, memoryQueryKey]);

	const isEmpty =
		data.preferences.length === 0 &&
		data.facts.length === 0 &&
		data.episodes.length === 0;

	return {
		memory: data,
		isLoading,
		isError,
		isEmpty,
		forget,
		clearAll,
		pendingIds,
		clearing
	};
};

export default useMemory;
