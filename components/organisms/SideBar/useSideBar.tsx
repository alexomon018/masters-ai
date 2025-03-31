"use client";

import { dxdb } from "@/localdb/dexie";
import { useUser } from "@clerk/nextjs";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks";

const useSideBar = () => {
	const allThreads = useLiveQuery(() => dxdb.threads.toArray())!;
	const router = useRouter();
	const { user, isLoaded } = useUser();
	const [openSearch, setOpenSearch] = useState(false);
	const [, setIsCloudSyncEnabled] = useLocalStorage("isCloudSyncEnabled", true);
	const queryClient = useQueryClient();

	const pinnedThreads = useLiveQuery(() =>
		dxdb.threads
			.toArray()
			.then((threadList) => threadList.filter((thread) => thread.isPinned))
	)!;
	const unpinnedThreads = useLiveQuery(() =>
		dxdb.threads
			.toArray()
			.then((threadList) => threadList.filter((thread) => !thread.isPinned))
	)!;

	const { mutateAsync: deleteThread } = useMutation({
		mutationFn: async (threadId: string) => {
			// Temporarily disable cloud sync
			setIsCloudSyncEnabled(false);

			try {
				// Delete locally first
				await dxdb.deleteThread(threadId);

				// Wait for server deletion to complete
				const response = await fetch("/api/sync", {
					method: "DELETE",
					body: JSON.stringify({ threadId })
				});

				if (!response.ok) {
					throw new Error("Failed to delete thread on server");
				}

				// Invalidate any cached data
				await queryClient.invalidateQueries({ queryKey: ["sync"] });

				// Force a fresh reload of the page instead of client-side navigation
				// window.location.href = "/chat";
				router.push("/chat");
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
		handlePinThread
	};
};

export default useSideBar;
