"use client";

import React from "react";
import { cn } from "@utils";
import { DEX_Thread } from "@/localdb/dexie";
import { Avatar, AvatarFallback, AvatarImage } from "@atoms";
import { ChatBubbleIcon, TrashIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { Settings2Icon } from "lucide-react";
import useSideBar from "./useSideBar";

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
				"w-full cursor-pointer p-4 outline-none transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
				isActive && "bg-gray-50 dark:bg-gray-800"
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

const SideBar = ({ activeThread }: SideBarProps) => {
	const router = useRouter();

	const {
		threads,
		deleteThread,
		startNewChat,
		handleChatSelect,
		user,
		isLoaded
	} = useSideBar();

	const renderChatList = () => {
		if (threads?.length === 0) {
			return <div className="p-4 text-center text-gray-500">No chats yet</div>;
		}

		return threads
			?.sort(
				(a, b) =>
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			)
			.map((chat) => (
				<ChatItem
					key={chat.id}
					chat={{
						...chat,
						created_at: new Date(chat.created_at).toISOString()
					}}
					isActive={activeThread?.id === chat.id}
					onSelect={handleChatSelect}
					onDelete={deleteThread}
				/>
			));
	};

	return (
		<aside
			className={cn(
				"hidden sticky top-0 z-30 flex-col w-80 h-screen border-r border-gray-200 md:flex"
			)}
		>
			<div className="flex justify-between items-center p-4 border-b border-gray-200">
				<h2 className="flex-1 text-xl font-semibold">Chat History</h2>
				<button
					type="button"
					className="cursor-pointer size-6"
					onClick={startNewChat}
				>
					<ChatBubbleIcon className="size-6" />
				</button>
			</div>

			<div className="overflow-y-auto flex-1">
				<div className="w-full divide-y divide-gray-200">
					{renderChatList()}
				</div>
			</div>

			{isLoaded &&
				(user ? (
					<div className="flex justify-between items-center p-4 border-t border-gray-200">
						<div className="flex gap-3 items-center">
							<Avatar>
								<AvatarImage src={user.imageUrl} alt="User avatar" />
								<AvatarFallback>
									{user.fullName?.charAt(0) || user.username?.charAt(0)}
								</AvatarFallback>
							</Avatar>
							<span className="font-medium">
								{user.fullName || user.username}
							</span>
						</div>
						<button
							type="button"
							className="p-1 rounded-full size-8 hover:bg-gray-100 dark:hover:bg-gray-800"
							onClick={() => router.push("/settings/account")}
						>
							<Settings2Icon className="size-6" />
						</button>
					</div>
				) : (
					<button
						type="button"
						className="p-4 w-full font-medium text-left border-t border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
						onClick={() => router.push("/auth")}
					>
						Login
					</button>
				))}
		</aside>
	);
};

export default SideBar;
