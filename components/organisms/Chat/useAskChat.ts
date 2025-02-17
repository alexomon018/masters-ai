"use client";

import { Message, useChat } from "ai/react";
import { useState, useEffect } from "react";
import { useThread } from "@/providers/threadProvider";
import { dxdb } from "@/localdb/dexie";
import { useRouter } from "next/navigation";
const useAskChat = (threadId: string) => {
	const [streaming, setStreaming] = useState<boolean>(false);
	const {
		threads,
		activeThreadId,
		addMessageToThread,
		updateThread,
		createThread
	} = useThread();
	const router = useRouter();

	let currentThreadId = threadId;

	const activeThread = threads.find((thread) => thread.id === activeThreadId);

	const handleMessageFinish = async (message: Message) => {
		try {
			await addMessageToThread(
				message.content,
				message.role as "user" | "assistant",
				currentThreadId
			);

			if (activeThread?.title === "New Chat" || !threadId) {
				const response = await fetch("/api/name-thread", {
					method: "POST",
					body: JSON.stringify({
						messages: chatConfig.messages
					})
				});

				const title = await response.json();
				await updateThread(currentThreadId, { title });
			}

			router.push(`/chat/${currentThreadId}`);
		} catch (error) {
			console.error("Failed to save message:", error);
		}

		setStreaming(false);
	};

	const chatConfig = useChat({
		api: "/api/masters",
		initialMessages: [
			{
				id: "0",
				role: "system",
				content: `**Welcome to Masters AI** Your ultimate companion in navigating Frontend Masters courses.`
			}
		],
		onFinish: handleMessageFinish
	});

	useEffect(() => {
		const fetchMessages = async () => {
			try {
				const messages = await dxdb.getThreadMessages(threadId);
				const formattedMessages = messages.map((msg) => ({
					id: msg.id,
					role: msg.role,
					content: msg.content
				}));
				chatConfig.setMessages([...formattedMessages]);
			} catch (error) {
				console.error("Failed to fetch messages:", error);
			}
		};

		if (threadId) {
			fetchMessages();
		}
	}, [threadId]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!threadId) {
			currentThreadId = await createThread("New Chat");
		}
		if (chatConfig.input.trim()) {
			await addMessageToThread(chatConfig.input, "user", currentThreadId);
		}

		chatConfig.handleSubmit(e);
		setStreaming(true);
	};

	return {
		...chatConfig,
		streaming,
		setStreaming,
		threadId,
		handleSubmit
	};
};

export default useAskChat;
