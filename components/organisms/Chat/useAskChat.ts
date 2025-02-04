import { Message, useChat } from "ai/react";
import { useState, useEffect } from "react";

const useAskChat = (threadId: string) => {
	const [streaming, setStreaming] = useState<boolean>(false);

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
				await fetch("/api/messages", {
					method: "POST",
					body: JSON.stringify({
						threadId,
						content: message.content,
						role: message.role
					})
				});
			} catch (error) {
				console.error("Failed to save message:", error);
			}
			setStreaming(false);
		}
	});

	// Add useEffect to fetch messages
	useEffect(() => {
		const fetchMessages = async () => {
			try {
				const response = await fetch(`/api/messages?threadId=${threadId}`);
				const data = await response.json();

				chatConfig.setMessages([...data]);
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
			await fetch("/api/messages", {
				method: "POST",
				body: JSON.stringify({
					threadId,
					content: chatConfig.input,
					role: "user"
				})
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
		handleSubmit
	};
};

export default useAskChat;
