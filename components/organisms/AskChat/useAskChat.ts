import { Message, useChat } from "ai/react";
import { useState } from "react";

const useAskChat = () => {
	const [streaming, setStreaming] = useState<boolean>(false);
	const [chatId, setChatId] = useState<number | null>(null);

	const chatConfig = useChat({
		api: "/api/masters",
		initialMessages: [
			{
				id: "0",
				role: "system",
				content: `**Welcome to Masters AI** Your ultimate companion in navigating Frontend Masters courses.`
			}
		],
		onResponse: async () => {
			if (!chatId) {
				const res = await fetch("/api/chats", {
					method: "POST"
				});
				const data = await res.json();
				console.log({ data });
				setChatId(data.id);
			}
		},
		onFinish: async (message: Message) => {
			try {
				if (chatId) {
					await fetch("/api/messages", {
						method: "POST",
						body: JSON.stringify({
							chatId,
							content: message.content,
							role: message.role
						})
					});
				} else {
					console.error("No chatId available for saving message");
					return;
				}
			} catch (error) {
				console.error("Failed to save message:", error);
			}
			setStreaming(false);
		}
	});

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (chatId && chatConfig.input.trim()) {
			await fetch("/api/messages", {
				method: "POST",
				body: JSON.stringify({
					chatId,
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
		chatId,
		handleSubmit
	};
};

export default useAskChat;
