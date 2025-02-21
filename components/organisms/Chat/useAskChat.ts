"use client";

import { Message, useChat } from "ai/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { dxdb } from "@/localdb/dexie";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";

const useAskChat = (threadId: string) => {
	const [streaming, setStreaming] = useState<boolean>(false);
	const router = useRouter();

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

			if (activeThread?.title === "New Chat" || !threadId) {
				const response = await fetch("/api/name-thread", {
					/* eslint-disable @typescript-eslint/no-use-before-define */
					method: "POST",
					body: JSON.stringify({
						messages: [message]
					})
				});

				const title = await response.json();
				await dxdb.updateThread(currentThreadId, { title });
			}

			router.push(`/chat/${currentThreadId}`);
		} catch (error) {
			console.error("Failed to save message:", error);
		}

		setStreaming(false);
	};

	const initialMessages = useMemo(
		() => [
			{
				id: "0",
				role: "system",
				content: `**Welcome to Masters AI** Your ultimate companion in navigating Frontend Masters courses.`
			},
			...(messages?.map((msg) => ({
				id: msg.id,
				role: msg.role,
				content: msg.content
			})) || [])
		],
		[messages, currentThreadId]
	);

	const chatConfig = useChat({
		api: "/api/masters",
		initialMessages: initialMessages as Message[],
		body: {
			chatId: currentThreadId
		},
		onFinish: handleMessageFinish
	});

	useEffect(() => {
		const fetchMessages = async () => {
			try {
				const messages = await dxdb.getThreadMessages(currentThreadId);
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

		if (!threadId) {
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
