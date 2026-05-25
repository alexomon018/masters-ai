import React from "react";
import type { ThreadDto } from "@/components/organisms/SideBar/threadsApi";
import ChatItem from "../ChatItem/ChatItem";

interface ChatItemSectionProps {
	title: string;
	threads: ThreadDto[];
	handleChatSelect: (id: string) => void;
	handlePinThread: (id: string) => void;
	deleteThread: (id: string) => void;
	activeThread: ThreadDto | null;
}

const ChatItemSection = ({
	title,
	threads,
	handleChatSelect,
	handlePinThread,
	deleteThread,
	activeThread
}: ChatItemSectionProps) => (
	<div>
		<h2 className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-[#e2e8f0]">
			{title}
		</h2>
		<div className="mb-4">
			{threads.map((chat) => (
				<ChatItem
					key={chat.id}
					chat={chat}
					isActive={activeThread?.id === chat.id}
					onSelect={handleChatSelect}
					isPinned={chat.pinned}
					handlePinThread={handlePinThread}
					onDelete={deleteThread}
				/>
			))}
		</div>
	</div>
);

export default ChatItemSection;
