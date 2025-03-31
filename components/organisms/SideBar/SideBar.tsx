"use client";

import React from "react";
import { DEX_Thread } from "@/localdb/dexie";
import { Avatar, AvatarFallback, AvatarImage, Button, Input } from "@atoms";
import { Settings2Icon, Search } from "lucide-react";
import { ChatItemSection } from "@molecules";
import { useRouter } from "next/navigation";
import useSideBar from "./useSideBar";

interface SideBarProps {
	activeThread: DEX_Thread | null;
}

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
		deleteThread,
		onSearch,
		searchQuery
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
						onChange={(e) => onSearch(e.target.value)}
						value={searchQuery}
						type="text"
						placeholder="Search your threads..."
						className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder:text-gray-500 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:border-[#2a2a2a] dark:bg-[#2a2a2a] dark:text-[#e2e8f0] dark:placeholder:text-gray-500 dark:focus:border-[#3a3a3a] dark:focus:ring-[#3a3a3a]"
					/>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				{pinnedThreads.length > 0 && (
					<ChatItemSection
						title="Pinned"
						threads={pinnedThreads}
						handleChatSelect={handleChatSelect}
						handlePinThread={handlePinThread}
						deleteThread={deleteThread}
						activeThread={activeThread}
					/>
				)}

				{recentUnpinned.length > 0 && (
					<ChatItemSection
						title="Last 30 Days"
						threads={recentUnpinned}
						handleChatSelect={handleChatSelect}
						handlePinThread={handlePinThread}
						deleteThread={deleteThread}
						activeThread={activeThread}
					/>
				)}

				{olderUnpinned.length > 0 && (
					<ChatItemSection
						title="Older"
						threads={olderUnpinned}
						handleChatSelect={handleChatSelect}
						handlePinThread={handlePinThread}
						deleteThread={deleteThread}
						activeThread={activeThread}
					/>
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
