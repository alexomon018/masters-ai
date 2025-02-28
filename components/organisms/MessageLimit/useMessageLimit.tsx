import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants";

interface MessageLimitInfo {
	userId: string;
	used: number;
	remaining: number;
	total: number;
	resetsAt: string;
}

export const useMessageLimit = () => {
	const {
		data: messageLimit,
		isLoading: loading,
		error
	} = useQuery<MessageLimitInfo>({
		queryKey: queryKeys.messageLimit(),
		queryFn: async () => {
			const response = await fetch("/api/user-info");

			if (!response.ok) {
				throw new Error("Failed to fetch message limit");
			}

			return response.json();
		}
	});

	return { messageLimit, loading, error };
};

export default useMessageLimit;
