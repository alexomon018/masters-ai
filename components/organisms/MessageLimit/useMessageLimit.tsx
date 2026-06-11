import { useQuery } from "@tanstack/react-query";
import { useTokenFn } from "@hooks";
import { messageLimitQueryOptions } from "./messageLimitQuery";

export const useMessageLimit = () => {
	const tokenFn = useTokenFn();

	const {
		data: messageLimit,
		isLoading: loading,
		error
	} = useQuery(messageLimitQueryOptions(tokenFn));

	return { messageLimit, loading, error };
};

export default useMessageLimit;
