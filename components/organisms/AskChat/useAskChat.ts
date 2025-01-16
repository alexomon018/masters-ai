import { Message, useChat } from "ai/react";
import { useState } from "react";
import { saveMessage } from "@/lib/data";

const useAskChat = () => {
	const [streaming, setStreaming] = useState<boolean>(false);

	const chatId = 1;

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
				setStreaming(false);
				if (!chatId) {
					throw new Error("No chat ID available");
				}
				await saveMessage(message.content, chatId, message.role);
			} catch (error) {
				console.error("Error saving message:", error);
			}
		}
	});

	return {
		...chatConfig,
		streaming,
		setStreaming,
		chatId
	};
};

export default useAskChat;
