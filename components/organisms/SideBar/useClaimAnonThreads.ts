import { useUser } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { queryKeys } from "@constants";
import { useTokenFn } from "@/components/organisms/Chat/helpers/useTokenFn";
import { claimAnonThreadsRemote } from "./threadsApi";

const THREADS_QUERY_KEY = queryKeys.threads();

const useClaimAnonThreads = () => {
	const { isLoaded, isSignedIn, user } = useUser();
	const queryClient = useQueryClient();
	const claimedForUserRef = useRef<string | null>(null);

	const tokenFn = useTokenFn();

	useEffect(() => {
		if (!isLoaded || !isSignedIn || !user?.id) return;
		if (claimedForUserRef.current === user.id) return;
		claimedForUserRef.current = user.id;

		claimAnonThreadsRemote(tokenFn)
			.then((reassigned) => {
				if (reassigned > 0) {
					queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
				}
			})
			.catch(() => {});
	}, [isLoaded, isSignedIn, user?.id, tokenFn, queryClient]);
};

export default useClaimAnonThreads;
