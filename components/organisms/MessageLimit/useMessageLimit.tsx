import queryKeys from "@/constants/queryKeys";
import { useQuery } from "@tanstack/react-query";

interface MessageLimitInfo {
	userId: string;
	used: number;
	remaining: number;
	total: number;
	resetsAt: string;
}

// TO DO:
// Add react query to fetch message limit

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
