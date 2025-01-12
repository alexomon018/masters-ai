import { useChat } from "ai/react";
import { useState } from "react";

const useAskChat = () => {
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
		onResponse: () => {
			setStreaming(false);
		}
	});

	return {
		...chatConfig,
		streaming,
		setStreaming
	};
};

export default useAskChat;
