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
			<div className="mb-1 flex items-center justify-center">
				<h3 className="flex-1 text-left font-medium">{chat.title}</h3>
				<span className="mr-2 text-xs text-gray-500">
					{new Date(chat.created_at).toLocaleDateString()}
				</span>
				<TrashIcon
					className="size-4 cursor-pointer"
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

	const deleteThread = async (threadId: string) => {
		await dxdb.deleteThread(threadId);
		router.push("/chat");
	};

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

	const renderChatList = () => {
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
	};

	return (
		<>
			{!isSidebarOpen && (
				<div className="fixed left-4 top-4 z-30 flex flex-col gap-4">
					<button
						type="button"
						className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm md:hidden"
						onClick={() => setIsSidebarOpen(true)}
					>
						<AllSidesIcon className="size-6" />
					</button>
					<button
						type="button"
						className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm"
						onClick={startNewChat}
					>
						<ChatBubbleIcon className="size-6" />
					</button>
				</div>
			)}

			<aside
				className={cn(
					"sticky top-0 h-screen border-r border-gray-200 bg-white",
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
						className="size-6 cursor-pointer"
						onClick={() => setIsSidebarOpen(!isSidebarOpen)}
					/>
				</div>

				{isSidebarOpen && (
					<div className="w-full justify-between divide-y divide-gray-200">
						{renderChatList()}
					</div>
				)}
			</aside>
		</>
	);
};

export default SideBar;
