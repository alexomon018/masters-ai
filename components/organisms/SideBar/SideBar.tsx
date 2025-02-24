"use client";

import React, { useCallback } from "react";
import { cn } from "@utils";
import { DEX_Thread, dxdb } from "@/localdb/dexie";
import { ChatBubbleIcon, TrashIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Settings2Icon } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";

interface SideBarProps {
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

const SideBar = ({ activeThread }: SideBarProps) => {
	const threads = useLiveQuery(() => dxdb.threads.toArray())!;
	const router = useRouter();
	const { user, isLoaded } = useUser();

	console.log("user", user);

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
		<aside className="sticky top-0 z-30 flex h-screen w-80 flex-col border-r border-gray-200 bg-white">
			<div className="flex items-center justify-between border-b border-gray-200 p-4">
				<h2 className="flex-1 text-xl font-semibold">Chat History</h2>
				<button
					type="button"
					className="size-6 cursor-pointer"
					onClick={startNewChat}
				>
					<ChatBubbleIcon className="size-6" />
				</button>
			</div>

			<div className="flex-1 overflow-y-auto">
				<div className="w-full divide-y divide-gray-200">
					{renderChatList()}
				</div>
			</div>

			{isLoaded &&
				(user ? (
					<div className="flex items-center justify-between border-t border-gray-200 bg-white p-4">
						<div className="flex items-center gap-3">
							<img
								src={user.imageUrl}
								alt="User avatar"
								className="size-8 rounded-full"
							/>
							<span className="font-medium">
								{user.fullName || user.username}
							</span>
						</div>
						<button
							type="button"
							className="size-8 rounded-full p-1 hover:bg-gray-100"
							onClick={() => router.push("/settings/account")}
						>
							<Settings2Icon className="size-6" />
						</button>
					</div>
				) : (
					<button
						type="button"
						className="w-full border-t border-gray-200 bg-white p-4 text-left font-medium hover:bg-gray-50"
						onClick={() => router.push("/auth")}
					>
						Login
					</button>
				))}
		</aside>
	);
};

export default SideBar;
