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

	const [pendingId, setPendingId] = useState<string | null>(null);
	const [clearing, setClearing] = useState(false);

	const forget = useCallback(
		async (memoryId: string) => {
			setPendingId(memoryId);
			try {
				await deleteMemoryItem(tokenFn, memoryId);
				await queryClient.invalidateQueries({ queryKey: memoryQueryKey });
			} finally {
				setPendingId(null);
			}
		},
		[tokenFn, queryClient, memoryQueryKey]
	);

	const clearAll = useCallback(async () => {
		setClearing(true);
		try {
			await clearAllMemory(tokenFn);
			await queryClient.invalidateQueries({ queryKey: memoryQueryKey });
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
		pendingId,
		clearing
	};
};

export default useMemory;
