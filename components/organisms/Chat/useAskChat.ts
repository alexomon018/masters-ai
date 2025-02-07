"use client";

import { Message, useChat } from "ai/react";
import { useState, useEffect } from "react";
import { useThread } from "@/providers/threadProvider";
import { dxdb } from "@/localdb/dexie";

const useAskChat = (threadId: string) => {
	const [streaming, setStreaming] = useState<boolean>(false);
	const { threads, activeThreadId, addMessageToThread, updateThread } =
		useThread();

	const activeThread = threads.find((thread) => thread.id === activeThreadId);

	const chatConfig = useChat({
		api: "/api/masters",
		initialMessages: [
			{
				id: "0",
				role: "system",
				content: `**Welcome to Masters AI** Your ultimate companion in navigating Frontend Masters courses.`
			}
		],
		onFinish: async (message: Message) => {
			try {
				addMessageToThread(
					message.content,
					message.role as "user" | "assistant",
					threadId
				);

				if (activeThread?.title === "New Chat") {
					console.log("ovde pjucam");
					const response = await fetch("/api/name-thread", {
						method: "POST",
						body: JSON.stringify({
							messages: chatConfig.messages
						})
					});

					const title = await response.json();

					updateThread(threadId, {
						title: title
					});
				}
			} catch (error) {
				console.error("Failed to save message:", error);
			}

			setStreaming(false);
		}
	});

	// Update useEffect to fetch messages from Dexie
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

		if (threadId && chatConfig.input.trim()) {
			addMessageToThread(chatConfig.input, "user", threadId);
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
