import { dxdb } from "@/localdb/dexie";
import { useUser } from "@clerk/nextjs";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";

const useSideBar = () => {
	const threads = useLiveQuery(() => dxdb.threads.toArray())!;
	const router = useRouter();
	const { user, isLoaded } = useUser();

	const { mutate: deleteThread } = useMutation({
		mutationFn: async (threadId: string) => {
			await dxdb.deleteThread(threadId);
			await fetch("/api/sync", {
				method: "DELETE",
				body: JSON.stringify({ threadId })
			});
			router.push("/chat");
		}
	});

	const startNewChat = useCallback(async () => {
		try {
			if (threads.length === 0) {
				const threadId = await dxdb.createThread({ title: "New Chat" });
				router.push(`/chat/${threadId}`);
				return;
			}

			const existingThread = threads.find(
				(thread) => thread.title === "New Chat"
			);

			if (existingThread) {
				return;
			}

			const threadId = await dxdb.createThread({ title: "New Chat" });

			router.push(`/chat/${threadId}`);
		} catch (error) {
			console.error("Failed to create chat:", error);
		}
	}, [router, threads]);

	const handleChatSelect = useCallback(
		(chatId: string) => {
			router.push(`/chat/${chatId}`);
		},
		[router]
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
		isLoaded
	};
};

export default useSideBar;
