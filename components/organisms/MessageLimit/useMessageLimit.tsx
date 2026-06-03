import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants";
import { useTokenFn } from "@hooks";
import {
	buildAuthQueryParams,
	workerHttpBase
} from "@/components/organisms/Chat/helpers/agentAuth";

interface MessageLimitInfo {
	userId: string;
	used: number;
	remaining: number;
	total: number;
	resetsAt: string;
}

export const useMessageLimit = () => {
	const tokenFn = useTokenFn();

	const {
		data: messageLimit,
		isLoading: loading,
		error
	} = useQuery<MessageLimitInfo>({
		queryKey: queryKeys.messageLimit(),
		queryFn: async () => {
			const base = workerHttpBase();
			if (!base) {
				throw new Error("Worker URL is not configured");
			}
			const params = await buildAuthQueryParams(tokenFn);
			const response = await fetch(`${base}/usage?${params.toString()}`);

			if (!response.ok) {
				throw new Error("Failed to fetch message limit");
			}

			return response.json();
		}
	});

	return { messageLimit, loading, error };
};

export default useMessageLimit;
