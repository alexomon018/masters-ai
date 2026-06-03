import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants";

// Worker increments quota at turn start, so invalidate on both streaming edges.
const useQuotaInvalidation = (isStreaming: boolean) => {
	const queryClient = useQueryClient();
	const prevStreamingRef = useRef(isStreaming);

	useEffect(() => {
		if (prevStreamingRef.current !== isStreaming) {
			queryClient.invalidateQueries({ queryKey: queryKeys.messageLimit() });
		}
		prevStreamingRef.current = isStreaming;
	}, [isStreaming, queryClient]);
};

export default useQuotaInvalidation;
