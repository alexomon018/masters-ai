"use client";

import React, { useCallback } from "react";
import { cn } from "@utils";
import { DEX_Thread, dxdb } from "@/localdb/dexie";
import { AllSidesIcon, ChatBubbleIcon, TrashIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";

interface SideBarProps {
	isSidebarOpen: boolean;
	setIsSidebarOpen: (isSidebarOpen: boolean) => void;
	activeThread: DEX_Thread | null;
}

const ChatItem = React.memo(
	({
		chat,
		isActive,
		onSelect,
		onDelete
	}: {
		chat: { id: string; title: string; created_at: string };
		isActive: boolean;
		onSelect: (id: string) => void;
		onDelete: (id: string) => void;
	}) => (
		<button
			type="button"
			onClick={() => onSelect(chat.id)}
			className={cn(
				"w-full cursor-pointer p-4 outline-none transition-colors hover:bg-gray-50",
				isActive && "bg-gray-50"
			)}
		>
			<div className="flex justify-center items-center mb-1">
				<h3 className="flex-1 font-medium text-left">{chat.title}</h3>
				<span className="mr-2 text-xs text-gray-500">
					{new Date(chat.created_at).toLocaleDateString()}
				</span>
				<TrashIcon
					className="cursor-pointer size-4"
					onClick={(e) => {
						e.stopPropagation();
						onDelete(chat.id);
					}}
				/>
			</div>
		</button>
	)
);

const SideBar = ({
	isSidebarOpen,
	setIsSidebarOpen,
	activeThread
}: SideBarProps) => {
	const threads = useLiveQuery(() => dxdb.threads.toArray())!;

	const router = useRouter();

	const deleteThread = useCallback(async (threadId: string) => {
		await dxdb.deleteThread(threadId);
	}, []);

	const startNewChat = useCallback(async () => {
		try {
			const threadId = await dxdb.createThread({ title: "New Chat" });
			router.push(`/chat/${threadId}`);
		} catch (error) {
			console.error("Failed to create chat:", error);
		}
	}, [router]);

	const handleChatSelect = useCallback(
		(chatId: string) => {
			router.push(`/chat/${chatId}`);
		},
		[router]
	);

	const renderChatList = useCallback(() => {
		if (threads?.length === 0) {
			return <div className="p-4 text-center text-gray-500">No chats yet</div>;
		}

		return threads?.map((chat) => (
			<ChatItem
				key={chat.id}
				chat={{
					...chat,
					created_at: chat.created_at.toISOString()
				}}
				isActive={activeThread?.id === chat.id}
				onSelect={handleChatSelect}
				onDelete={deleteThread}
			/>
		));
	}, [threads, activeThread, handleChatSelect, deleteThread]);

	return (
		<>
			{!isSidebarOpen && (
				<div className="flex fixed top-4 left-4 z-30 flex-col gap-4">
					<button
						type="button"
						className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm md:hidden"
						onClick={() => setIsSidebarOpen(true)}
					>
						<AllSidesIcon className="size-6" />
					</button>
					<button
						type="button"
						className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm"
						onClick={startNewChat}
					>
						<ChatBubbleIcon className="size-6" />
					</button>
				</div>
			)}

			<aside
				className={cn(
					"sticky top-0 h-screen bg-white border-r border-gray-200",
					"overflow-y-auto transition-all duration-300",
					isSidebarOpen ? "w-80" : "w-16",
					"z-30"
				)}
			>
				<div
					className={cn(
						"flex items-center justify-between border-b border-gray-200 p-4",
						!isSidebarOpen && "flex-col items-center justify-center gap-5"
					)}
				>
					{isSidebarOpen && (
						<h2 className="flex-1 text-xl font-semibold">Chat History</h2>
					)}
					<button
						type="button"
						className={cn(
							"mr-5 size-6 cursor-pointer",
							!isSidebarOpen && "mr-0"
						)}
						onClick={startNewChat}
					>
						<ChatBubbleIcon className="size-6" />
					</button>
					<AllSidesIcon
						className="cursor-pointer size-6"
						onClick={() => setIsSidebarOpen(!isSidebarOpen)}
					/>
				</div>

				{isSidebarOpen && (
					<div className="justify-between w-full divide-y divide-gray-200">
						{renderChatList()}
					</div>
				)}
			</aside>
		</>
	);
};

export default SideBar;
