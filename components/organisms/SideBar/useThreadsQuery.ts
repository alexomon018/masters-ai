import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@constants";
import { useTokenFn } from "@/components/organisms/Chat/helpers/useTokenFn";
import { fetchThreads } from "./threadsApi";

// Single source of truth for the threads query. Both the sidebar and the
// auto-name hook read this list; defining the key and options here keeps them
// from drifting (e.g. one enabling refetchOnWindowFocus and the other not).
export const threadsQueryOptions = (
	tokenFn: () => Promise<string | null>
) =>
	queryOptions({
		queryKey: queryKeys.threads(),
		queryFn: () => fetchThreads(tokenFn),
		// The list mutates from inside this app and from the auto-name
		// background call. Refetch on window focus keeps the sidebar honest
		// without wiring optimistic updates on every code path.
		refetchOnWindowFocus: true,
		staleTime: 30_000
	});

export const useThreadsQuery = () => {
	const tokenFn = useTokenFn();
	return useQuery(threadsQueryOptions(tokenFn));
};

export default useThreadsQuery;
