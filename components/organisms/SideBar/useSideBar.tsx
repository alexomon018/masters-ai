"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import debounce from "lodash/debounce";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	useMutation,
	useQuery,
	useQueryClient
} from "@tanstack/react-query";
import {
	deleteThreadRemote,
	fetchThreads,
	upsertThreadRemote,
	type ThreadDto
} from "./threadsApi";
import useClaimAnonThreads from "./useClaimAnonThreads";

const THREADS_QUERY_KEY = ["threads"] as const;

const useSideBar = () => {
	const router = useRouter();
	const { user, isLoaded } = useUser();
	const { getToken } = useAuth();
	const [openSearch, setOpenSearch] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const queryClient = useQueryClient();

	const tokenFn = useCallback(
		async () =>
			typeof getToken === "function" ? getToken() : null,
		[getToken]
	);

	useClaimAnonThreads();

	const { data: threads = [] } = useQuery({
		queryKey: THREADS_QUERY_KEY,
		queryFn: () => fetchThreads(tokenFn),
		// The list mutates from inside this app and from the auto-name
		// background call. Refetch on window focus keeps the sidebar honest
		// without us wiring optimistic updates on every code path.
		refetchOnWindowFocus: true,
		staleTime: 30_000
	});

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
		},
		onMutate: async (threadId) => {
			await queryClient.cancelQueries({ queryKey: THREADS_QUERY_KEY });
			const previous = queryClient.getQueryData<ThreadDto[]>(
				THREADS_QUERY_KEY
			);
			queryClient.setQueryData<ThreadDto[]>(
				THREADS_QUERY_KEY,
				(prev) => prev?.filter((t) => t.id !== threadId) ?? []
			);
			router.replace("/");
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
		// Don't pre-create rows. /chat/<id> with no id lands on the same page
		// and the chat hook mints + persists the thread on the first message.
		router.push("/");
	}, [router]);

	const handleChatSelect = useCallback(
		(chatId: string) => {
			router.push(`/chat/${chatId}`);
		},
		[router]
	);

	const { mutate: togglePin } = useMutation({
		mutationFn: async ({
			threadId,
			pinned
		}: {
			threadId: string;
			pinned: boolean;
		}) => upsertThreadRemote(tokenFn, { threadId, pinned }),
		onMutate: async ({ threadId, pinned }) => {
			await queryClient.cancelQueries({ queryKey: THREADS_QUERY_KEY });
			const previous = queryClient.getQueryData<ThreadDto[]>(
				THREADS_QUERY_KEY
			);
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
			togglePin({ threadId, pinned: !thread.pinned });
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
