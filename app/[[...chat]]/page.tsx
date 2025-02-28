"use client";

import { Chat } from "@organisms";
import QueryClientProvider from "@/providers/queryClientProvider";

import { useParams } from "next/navigation";

const ChatPage = () => {
	const params = useParams();
	const chatId = params.chat?.[1];

	return (
		<QueryClientProvider>
			<Chat threadId={chatId || ""} />
		</QueryClientProvider>
	);
};

export default ChatPage;
