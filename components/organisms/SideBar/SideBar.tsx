"use client";

import React from "react";
import { cn } from "@utils";
import { DEX_Thread } from "@/localdb/dexie";
import { Avatar, AvatarFallback, AvatarImage, Button, Input } from "@atoms";
import { Settings2Icon, Search, XIcon, PinIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import useSideBar from "./useSideBar";

interface SideBarProps {
	activeThread: DEX_Thread | null;
}

const ChatItem = React.memo(
	({
		chat,
		isActive,
		onSelect,
		isPinned,
		handlePinThread,
		onDelete
	}: {
		chat: DEX_Thread;
		isActive: boolean;
		onSelect: (id: string) => void;
		isPinned: boolean;
		onDelete: (id: string) => void;
		handlePinThread: (id: string) => void;
	}) => (
		<div className="group relative px-2">
			<button
				type="button"
				onClick={() => onSelect(chat.id)}
				className={cn(
					"w-full cursor-pointer rounded-md px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-[#e2e8f0] dark:hover:bg-[#2a2a2a]",
					isActive && "bg-gray-100 dark:bg-[#2a2a2a]"
				)}
			>
				<h3 className="font-normal">{chat.title}</h3>
			</button>
			<div className="absolute right-4 top-1/2 -translate-y-1/2 space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
				<button
					type="button"
					className="rounded p-1 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]"
					onClick={(e) => {
						e.stopPropagation();
						handlePinThread(chat.id);
					}}
				>
					<PinIcon
						className={cn(
							"size-4 text-gray-500 dark:text-[#e2e8f0]",
							isPinned && "fill-current"
						)}
					/>
				</button>
				<button
					type="button"
					className="rounded p-1 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]"
					onClick={(e) => {
						e.stopPropagation();
						onDelete(chat.id);
						// Handle delete
					}}
				>
					<XIcon className="size-4 text-gray-500 dark:text-[#e2e8f0]" />
				</button>
			</div>
		</div>
	)
);

const SideBar = ({ activeThread }: SideBarProps) => {
	const router = useRouter();
	const {
		startNewChat,
		handleChatSelect,
		user,
		isLoaded,
		pinnedThreads,
		unpinnedThreads,
		handlePinThread,
		deleteThread
	} = useSideBar();

	const groupThreadsByDate = (threads: DEX_Thread[]) => {
		if (!threads?.length) return { recent: [], older: [] };

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		return threads.reduce(
			(acc, thread) => {
				const threadDate = new Date(thread.created_at);
				if (threadDate >= thirtyDaysAgo) {
					acc.recent.push(thread);
				} else {
					acc.older.push(thread);
				}
				return acc;
			},
			{ recent: [], older: [] } as { recent: DEX_Thread[]; older: DEX_Thread[] }
		);
	};

	const { recent: recentUnpinned, older: olderUnpinned } =
		groupThreadsByDate(unpinnedThreads);

	return (
		<aside className="sticky top-0 z-30 hidden h-screen w-80 flex-col border-r border-gray-200 bg-white dark:border-[#2a2a2a] dark:bg-[#1a1a1a] md:flex">
			<div className="flex items-center justify-center p-4">
				<h1 className="text-center text-lg font-medium text-gray-900 dark:text-[#e2e8f0]">
					masters.chat
				</h1>
			</div>
			<div className="flex flex-col gap-4 px-4 pb-4">
				<Button
					type="button"
					onClick={startNewChat}
					className="w-full rounded-md bg-gray-200 py-3 text-center font-medium text-gray-900 hover:bg-gray-300 dark:bg-[#2a2a2a] dark:text-[#e2e8f0] dark:hover:bg-[#3a3a3a]"
				>
					New Chat
				</Button>
				<div className="relative">
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
					<Input
						type="text"
						placeholder="Search your threads..."
						className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder:text-gray-500 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:border-[#2a2a2a] dark:bg-[#2a2a2a] dark:text-[#e2e8f0] dark:placeholder:text-gray-500 dark:focus:border-[#3a3a3a] dark:focus:ring-[#3a3a3a]"
					/>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				{pinnedThreads.length > 0 && (
					<>
						<h2 className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-[#e2e8f0]">
							Pinned
						</h2>
						<div className="mb-4">
							{pinnedThreads.map((chat) => (
								<ChatItem
									key={chat.id}
									chat={chat}
									isActive={activeThread?.id === chat.id}
									onSelect={handleChatSelect}
									isPinned
									handlePinThread={handlePinThread}
									onDelete={deleteThread}
								/>
							))}
						</div>
					</>
				)}

				{recentUnpinned.length > 0 && (
					<>
						<h2 className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-[#e2e8f0]">
							Last 30 Days
						</h2>
						<div className="mb-4">
							{recentUnpinned.map((chat) => (
								<ChatItem
									key={chat.id}
									chat={chat}
									isActive={activeThread?.id === chat.id}
									onSelect={handleChatSelect}
									isPinned={false}
									handlePinThread={handlePinThread}
									onDelete={deleteThread}
								/>
							))}
						</div>
					</>
				)}

				{olderUnpinned.length > 0 && (
					<>
						<h2 className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-[#e2e8f0]">
							Older
						</h2>
						<div>
							{olderUnpinned.map((chat) => (
								<ChatItem
									key={chat.id}
									chat={chat}
									isActive={activeThread?.id === chat.id}
									onSelect={handleChatSelect}
									isPinned={false}
									handlePinThread={handlePinThread}
									onDelete={deleteThread}
								/>
							))}
						</div>
					</>
				)}
			</div>

			{isLoaded && (
				<div className="border-t border-gray-200 p-4 dark:border-[#2a2a2a]">
					{user ? (
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Avatar>
									<AvatarImage src={user.imageUrl} alt="User avatar" />
									<AvatarFallback className="bg-gray-100 text-gray-700 dark:bg-[#2a2a2a] dark:text-[#e2e8f0]">
										{user.fullName?.charAt(0) || user.username?.charAt(0)}
									</AvatarFallback>
								</Avatar>
								<span className="text-gray-700 dark:text-[#e2e8f0]">
									{user.fullName || user.username}
								</span>
							</div>
							<button
								type="button"
								className="rounded-full p-2 text-gray-700 hover:bg-gray-100 dark:text-[#e2e8f0] dark:hover:bg-[#2a2a2a]"
								onClick={() => router.push("/settings/account")}
							>
								<Settings2Icon className="size-5" />
							</button>
						</div>
					) : (
						<button
							type="button"
							className="w-full rounded-md bg-gray-100 px-4 py-2 text-left font-medium text-gray-700 hover:bg-gray-200 dark:bg-[#2a2a2a] dark:text-[#e2e8f0] dark:hover:bg-[#3a3a3a]"
							onClick={() => router.push("/auth")}
						>
							Login
						</button>
					)}
				</div>
			)}
		</aside>
	);
};

export default SideBar;
