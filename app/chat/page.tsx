"use client";

import { useRouter } from "next/navigation";

const ChatPage = () => {
	const router = useRouter();

	const startNewChat = async () => {
		try {
			const response = await fetch("/api/chats", {
				method: "POST"
			});

			if (!response.ok) {
				throw new Error("Failed to create chat");
			}

			const { id } = await response.json();
			router.push(`/chat/${id}`);
		} catch (error) {
			console.error("Failed to create chat:", error);
			// You might want to show an error message to the user here
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center">
			<button
				type="button"
				onClick={startNewChat}
				className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
			>
				Start New Chat
			</button>
		</div>
	);
};

export default ChatPage;
