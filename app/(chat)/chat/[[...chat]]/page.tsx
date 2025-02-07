"use client";

import { Chat } from "@organisms";
import { useParams } from "next/navigation";
import { ThreadProvider } from "@/providers/threadProvider";

const ChatPage = () => {
	const params = useParams();
	const chatId = params.chat?.[0]; // Gets the first segment after /chat/

	return (
		<ThreadProvider>
			<Chat threadId={chatId || ""} />
		</ThreadProvider>
	);
};

export default ChatPage;
