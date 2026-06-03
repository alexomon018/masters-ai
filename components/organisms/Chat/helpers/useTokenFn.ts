import { useAuth } from "@clerk/clerk-react";
import { useCallback } from "react";

// Stable `() => Promise<string | null>` wrapper around Clerk's getToken, shared
// by every hook that authenticates a worker call (threads list, quota, agent
// connect, auto-name). Clerk always hands back a function, so this just pins a
// stable identity across renders for useQuery/useCallback dependency arrays.
export const useTokenFn = (): (() => Promise<string | null>) => {
	const { getToken } = useAuth();
	return useCallback(() => getToken(), [getToken]);
};

export default useTokenFn;
