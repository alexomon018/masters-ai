import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "@tanstack/react-router";
import debounce from "lodash/debounce";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "@posthog/react";
import { queryKeys } from "@constants";
import { useTokenFn, useThreadsQuery } from "@hooks";
import { threadMessagesQueryOptions } from "@/components/organisms/Chat/helpers";
import {
	deleteThreadRemote,
	upsertThreadRemote,
	type ThreadDto
} from "./threadsApi";
import useClaimAnonThreads from "./useClaimAnonThreads";

const THREADS_QUERY_KEY = queryKeys.threads();

const useSideBar = () => {
	const navigate = useNavigate();
	const { user, isLoaded } = useUser();
	const posthog = usePostHog();
	const [openSearch, setOpenSearch] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const queryClient = useQueryClient();

	const tokenFn = useTokenFn();

	useClaimAnonThreads();

	const { data: threads = [] } = useThreadsQuery();

	const debouncedSetSearchQuery = useMemo(
		() =>
			debounce((query: string) => {
				setSearchQuery(query);
			}, 50),
		[]
	);

	const onSearch = useCallback(
		(query: string) => {
			debouncedSetSearchQuery(query);
		},
		[debouncedSetSearchQuery]
	);

	const filterByQuery = useCallback(
		(t: ThreadDto) =>
			searchQuery === "" ||
			t.title.toLowerCase().includes(searchQuery.toLowerCase()),
		[searchQuery]
	);

	const sortedThreads = useMemo(
		() => [...threads].sort((a, b) => b.createdAt - a.createdAt),
		[threads]
	);

	const pinnedThreads = useMemo(
		() => sortedThreads.filter((t) => t.pinned && filterByQuery(t)),
		[sortedThreads, filterByQuery]
	);

	const unpinnedThreads = useMemo(
		() => sortedThreads.filter((t) => !t.pinned && filterByQuery(t)),
		[sortedThreads, filterByQuery]
	);

	const { mutateAsync: deleteThread } = useMutation({
		mutationFn: async (threadId: string) => {
			await deleteThreadRemote(tokenFn, threadId);
			return threadId;
		},
		onSuccess: (threadId) => {
			posthog.capture("thread_deleted", { thread_id: threadId });
		},
		onMutate: async (threadId) => {
			await queryClient.cancelQueries({ queryKey: THREADS_QUERY_KEY });
			const previous = queryClient.getQueryData<ThreadDto[]>(THREADS_QUERY_KEY);
			queryClient.setQueryData<ThreadDto[]>(
				THREADS_QUERY_KEY,
				(prev) => prev?.filter((t) => t.id !== threadId) ?? []
			);
			queryClient.removeQueries({
				queryKey: queryKeys.threadMessages(threadId)
			});
			navigate({ to: "/", replace: true });
			return { previous };
		},
		onError: (_err, _threadId, ctx) => {
			if (ctx?.previous) {
				queryClient.setQueryData(THREADS_QUERY_KEY, ctx.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
		}
	});

	const startNewChat = useCallback(() => {
		// Don't pre-create rows. The home route mints a fresh id and the chat
		// hook persists the thread on the first message.
		navigate({ to: "/" });
	}, [navigate]);

	const handleChatSelect = useCallback(
		(chatId: string) => {
			navigate({ to: "/chat/$id", params: { id: chatId } });
		},
		[navigate]
	);

	// Warm the per-thread message cache on hover/focus so opening the thread
	// renders instantly. prefetchQuery dedupes in-flight requests and no-ops
	// while the cached data is still fresh.
	const prefetchThreadMessages = useCallback(
		(threadId: string) => {
			queryClient.prefetchQuery(threadMessagesQueryOptions(tokenFn, threadId));
		},
		[queryClient, tokenFn]
	);

	const { mutate: togglePin } = useMutation({
		mutationFn: async ({
			threadId,
			pinned
		}: {
			threadId: string;
			pinned: boolean;
		}) => {
			await upsertThreadRemote(tokenFn, { threadId, pinned });
			return { threadId, pinned };
		},
		onSuccess: ({ threadId, pinned }) => {
			posthog.capture("thread_pinned", { thread_id: threadId, pinned });
		},
		onMutate: async ({ threadId, pinned }) => {
			await queryClient.cancelQueries({ queryKey: THREADS_QUERY_KEY });
			const previous = queryClient.getQueryData<ThreadDto[]>(THREADS_QUERY_KEY);
			queryClient.setQueryData<ThreadDto[]>(
				THREADS_QUERY_KEY,
				(prev) =>
					prev?.map((t) => (t.id === threadId ? { ...t, pinned } : t)) ?? []
			);
			return { previous };
		},
		onError: (_err, _vars, ctx) => {
			if (ctx?.previous) {
				queryClient.setQueryData(THREADS_QUERY_KEY, ctx.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
		}
	});

	const handlePinThread = useCallback(
		(threadId: string) => {
			const thread = threads.find((t) => t.id === threadId);
			if (!thread) return;
			const newPinned = !thread.pinned;
			togglePin({ threadId, pinned: newPinned });
		},
		[threads, togglePin]
	);

	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			if (
				(event.metaKey || event.ctrlKey) &&
				event.shiftKey &&
				event.key === "0"
			) {
				event.preventDefault();
				startNewChat();
			}
		};

		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [startNewChat]);

	return {
		threads,
		deleteThread,
		startNewChat,
		handleChatSelect,
		prefetchThreadMessages,
		user,
		isLoaded,
		openSearch,
		setOpenSearch,
		pinnedThreads,
		unpinnedThreads,
		handlePinThread,
		onSearch,
		searchQuery
	};
};

export default useSideBar;
