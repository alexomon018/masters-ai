"use client";

import { Message, useChat } from "ai/react";
import { useState, useEffect } from "react";
import { dxdb } from "@/localdb/dexie";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { getQueryClient } from "@/providers/getQueryClient";
import useSync from "@/components/molecules/CloudSyncSection/useSync";
import { queryKeys } from "@/constants";

const useAskChat = (threadId: string) => {
	const [streaming, setStreaming] = useState<boolean>(false);
	const router = useRouter();
	const queryClient = getQueryClient();

	useSync();

	let currentThreadId = threadId;

	const activeThread = useLiveQuery(() =>
		dxdb.threads.get(currentThreadId || "")
	);

	const messages = useLiveQuery(() => dxdb.getThreadMessages(currentThreadId));

	const handleMessageFinish = async (message: Message) => {
		try {
			await dxdb.addMessage({
				content: message.content,
				role: message.role as "user" | "assistant",
				threadId: currentThreadId
			});

			const thread = await dxdb.threads.get(currentThreadId || "");

			if (thread?.title === "New Chat" || !currentThreadId) {
				const response = await fetch("/api/name-thread", {
					method: "POST",
					body: JSON.stringify({
						messages: [message]
					})
				});

				const title = await response.json();
				await dxdb.updateThread(currentThreadId, { title });
			}
			queryClient.invalidateQueries({ queryKey: queryKeys.messageLimit() });

			router.push(`/chat/${currentThreadId}`);
		} catch (error) {
			console.error("Failed to save message:", error);
			setStreaming(false);
		}

		setStreaming(false);
	};

	const initialMessages = [
		{
			id: "0",
			role: "system",
			content: `**Welcome to Masters Chat** Your ultimate companion in navigating Frontend Masters courses.`
		},
		...(messages?.map((msg) => ({
			id: msg.id,
			role: msg.role,
			content: msg.content
		})) || [])
	];

	const chatConfig = useChat({
		api: "/api/masters",
		initialMessages: initialMessages as Message[],
		body: {
			chatId: currentThreadId,
			model: "openai"
		},

		onResponse: async (response) => {
			if (response.status === 403) {
				await dxdb.addMessage({
					content: "You've reached your daily message limit of 3 messages.",
					role: "assistant",
					threadId: currentThreadId
				});

				chatConfig.setMessages([
					...chatConfig.messages,
					{
						id: "403",
						role: "assistant",
						content: "You've reached your daily message limit of 3 messages."
					}
				]);
				setStreaming(false);

				chatConfig.stop();
			}
		},
		onFinish: handleMessageFinish
	});

	useEffect(() => {
		const fetchMessages = async () => {
			try {
				if (!messages) {
					return;
				}
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

		if (currentThreadId) {
			fetchMessages();
		}
	}, [currentThreadId, chatConfig.setMessages]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!currentThreadId) {
			currentThreadId = await dxdb.createThread({ title: "New Chat" });
		}
		if (chatConfig.input.trim()) {
			await dxdb.addMessage({
				content: chatConfig.input,
				role: "user",
				threadId: currentThreadId
			});
		}

		chatConfig.handleSubmit(e);
		setStreaming(true);
	};
	return {
		...chatConfig,
		streaming,
		setStreaming,
		threadId,
		handleSubmit,
		activeThread
	};
};

export default useAskChat;
