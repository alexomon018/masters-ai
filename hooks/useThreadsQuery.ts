import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@constants";
import { fetchThreads } from "@/components/organisms/SideBar/threadsApi";
import { useTokenFn } from "./useTokenFn";

// Shared threads query — the sidebar and the auto-name hook read this same
// list, so the key and options live here so they can't drift apart.
export const threadsQueryOptions = (tokenFn: () => Promise<string | null>) =>
	queryOptions({
		queryKey: queryKeys.threads(),
		queryFn: () => fetchThreads(tokenFn),
		refetchOnWindowFocus: true,
		staleTime: 30_000
	});

export const useThreadsQuery = () => {
	const tokenFn = useTokenFn();
	return useQuery(threadsQueryOptions(tokenFn));
};

export default useThreadsQuery;
