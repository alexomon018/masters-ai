"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { claimAnonThreadsRemote } from "./threadsApi";

const THREADS_QUERY_KEY = ["threads"] as const;

const useClaimAnonThreads = () => {
	const { isLoaded, isSignedIn, user } = useUser();
	const { getToken } = useAuth();
	const queryClient = useQueryClient();
	const claimedForUserRef = useRef<string | null>(null);

	const tokenFn = useCallback(
		async () =>
			typeof getToken === "function" ? getToken() : null,
		[getToken]
	);

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
