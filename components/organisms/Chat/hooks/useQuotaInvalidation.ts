"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants";

/**
 * Refreshes the message-quota query on every streaming transition.
 *
 * The worker increments the per-day Redis counter at the *start* of a turn
 * (`onChatMessage`, before the stream begins) and not at the end, so we
 * need to invalidate on both edges:
 *   - idle → streaming: bump the counter immediately on submit
 *   - streaming → idle: pick up any post-turn adjustments (e.g. quota
 *     reset on a 24h window roll)
 * Without the idle→streaming side, the displayed counter is stale for the
 * entire duration of the response.
 */
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
