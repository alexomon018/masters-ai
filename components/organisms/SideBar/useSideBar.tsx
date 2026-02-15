"use client";

/* eslint-disable import/no-extraneous-dependencies */
import { dxdb } from "@/localdb/dexie";
import { useUser } from "@clerk/nextjs";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import debounce from "lodash/debounce";
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks";

const useSideBar = () => {
	const allThreads = useLiveQuery(() => dxdb.threads.toArray())!;
	const router = useRouter();
	const { user, isLoaded } = useUser();
	const [openSearch, setOpenSearch] = useState(false);
	const [, setIsCloudSyncEnabled] = useLocalStorage("isCloudSyncEnabled", true);
	const [searchQuery, setSearchQuery] = useState("");
	const queryClient = useQueryClient();

	// Create a debounced search function
	const debouncedSetSearchQuery = debounce((query: string) => {
		setSearchQuery(query);
	}, 50);

	const onSearch = useCallback(
		(query: string) => {
			debouncedSetSearchQuery(query);
		},
		[debouncedSetSearchQuery]
	);

	const pinnedThreads = useLiveQuery(
		() =>
			dxdb.threads
				.orderBy("created_at")
				.reverse()
				.filter(
					(thread) =>
						thread.isPinned &&
						(searchQuery === "" ||
							thread.title.toLowerCase().includes(searchQuery.toLowerCase()))
				)
				.toArray(),
		[searchQuery]
	)!;
	const unpinnedThreads = useLiveQuery(
		() =>
			dxdb.threads
				.orderBy("created_at")
				.reverse()
				.filter(
					(thread) =>
						!thread.isPinned &&
						(searchQuery === "" ||
							thread.title.toLowerCase().includes(searchQuery.toLowerCase()))
				)
				.toArray(),
		[searchQuery]
	)!;

	const { mutateAsync: deleteThread } = useMutation({
		mutationFn: async (threadId: string) => {
			// Temporarily disable cloud sync
			setIsCloudSyncEnabled(false);

			try {
				// Delete locally first
				await dxdb.deleteThread(threadId);

				// Navigate immediately after local delete
				router.replace("/");

				// Server sync in background — don't block navigation
				fetch("/api/sync", {
					method: "DELETE",
					body: JSON.stringify({ threadId })
				}).then(() => queryClient.invalidateQueries({ queryKey: ["sync"] }));
			} finally {
				// Re-enable cloud sync
				setIsCloudSyncEnabled(true);
			}
		}
	});

	const startNewChat = useCallback(async () => {
		try {
			if (allThreads.length === 0) {
				const threadId = await dxdb.createThread({
					title: "New Chat",
					isPinned: false
				});
				router.push(`/chat/${threadId}`);
				return;
			}

			const existingThread = allThreads.find(
				(thread) => thread.title === "New Chat"
			);

			if (existingThread) {
				return;
			}

			const threadId = await dxdb.createThread({
				title: "New Chat",
				isPinned: false
			});

			router.push(`/chat/${threadId}`);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Failed to create chat:", error);
		}
	}, [router, allThreads]);

	const handleChatSelect = useCallback(
		(chatId: string) => {
			router.push(`/chat/${chatId}`);
		},
		[router]
	);

	const handlePinThread = useCallback(
		async (threadId: string) => {
			const thread = allThreads.find((t) => t.id === threadId);
			if (thread) {
				await dxdb.updateThread(threadId, {
					isPinned: !thread.isPinned
				});
			}
		},
		[allThreads]
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
		threads: allThreads,
		deleteThread,
		startNewChat,
		handleChatSelect,
		user,
		isLoaded,
		openSearch,
		setOpenSearch,
		pinnedThreads: pinnedThreads || [],
		unpinnedThreads: unpinnedThreads || [],
		handlePinThread,
		onSearch,
		searchQuery
	};
};

export default useSideBar;
