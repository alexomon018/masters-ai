"use client";

import { Chat } from "@organisms";
import { useParams } from "next/navigation";

const ChatPage = () => {
	const params = useParams();
	const chatId = params.chat?.[1];

	return <Chat threadId={chatId || ""} />;
};

export default ChatPage;
