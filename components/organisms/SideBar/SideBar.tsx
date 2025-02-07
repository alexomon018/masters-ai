"use client";

import React from "react";
import { cn } from "@utils";
import { AllSidesIcon, ChatBubbleIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useThread } from "@/providers/threadProvider";
// Add interface for Chat type
interface Chat {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	title: string;
}

interface SideBarProps {
	isSidebarOpen: boolean;
	setIsSidebarOpen: (isSidebarOpen: boolean) => void;
}

const SideBar = ({ isSidebarOpen, setIsSidebarOpen }: SideBarProps) => {
	const { createThread, threads, activeThreadId } = useThread();
	const router = useRouter();

	const startNewChat = async () => {
		try {
			const id = crypto.randomUUID();
			createThread("New Chat", id);
			router.push(`/chat/${id}`);
		} catch (error) {
			console.error("Failed to create chat:", error);
			// You might want to show an error message to the user here
		}
	};

	const renderChatList = () => {
		if (threads.length === 0) {
			return <div className="p-4 text-center text-gray-500">No chats yet</div>;
		}

		return threads.map((chat) => (
			<button
				key={chat.id}
				onClick={() => {
					router.push(`/chat/${chat.id}`);
				}}
				className={cn(
					"w-full cursor-pointer p-4 outline-none transition-colors hover:bg-gray-50",
					activeThreadId === chat.id && "bg-gray-50"
				)}
			>
				<div className="mb-1 flex items-start justify-between">
					<h3 className="font-medium">{chat.title}</h3>

					<span className="text-xs text-gray-500">
						{new Date(chat.created_at).toLocaleDateString()}
					</span>
				</div>
			</button>
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
