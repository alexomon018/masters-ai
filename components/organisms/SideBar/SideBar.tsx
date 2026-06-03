"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage, Button, Input } from "@atoms";
import { Settings2Icon, Search } from "lucide-react";
import { ChatItemSection } from "@molecules";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@utils";
import type { ThreadDto } from "./threadsApi";
import useSideBar from "./useSideBar";

interface SideBarProps {
	activeThreadId: string;
	isOpen?: boolean;
	onClose?: () => void;
}

const SideBar = ({ activeThreadId, isOpen, onClose }: SideBarProps) => {
	const navigate = useNavigate();
	const [hasMounted, setHasMounted] = useState(false);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	const {
		threads,
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

	const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

	const handleChatSelectAndClose = useCallback(
		(chatId: string) => {
			handleChatSelect(chatId);
			onClose?.();
		},
		[handleChatSelect, onClose]
	);

	const startNewChatAndClose = useCallback(() => {
		startNewChat();
		onClose?.();
	}, [startNewChat, onClose]);

	const groupThreadsByDate = (threadList: ThreadDto[]) => {
		if (!threadList?.length) return { recent: [], older: [] };

		const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

		return threadList.reduce(
			(acc, thread) => {
				if (thread.createdAt >= thirtyDaysAgoMs) {
					acc.recent.push(thread);
				} else {
					acc.older.push(thread);
				}
				return acc;
			},
			{ recent: [], older: [] } as { recent: ThreadDto[]; older: ThreadDto[] }
		);
	};

	const { recent: recentUnpinned, older: olderUnpinned } =
		groupThreadsByDate(unpinnedThreads);

	const footerContent = (() => {
		if (!hasMounted || !isLoaded) {
			return (
				<div
					className="h-10 animate-pulse rounded-md bg-gray-100 dark:bg-[#2a2a2a]"
					aria-hidden
				/>
			);
		}

		if (user) {
			return (
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
						onClick={() =>
							navigate({ to: "/settings/$tab", params: { tab: "account" } })
						}
					>
						<Settings2Icon className="size-5" />
					</button>
				</div>
			);
		}

		return (
			<button
				type="button"
				className="w-full rounded-md bg-gray-100 px-4 py-2 text-left font-medium text-gray-700 hover:bg-gray-200 dark:bg-[#2a2a2a] dark:text-[#e2e8f0] dark:hover:bg-[#3a3a3a]"
				onClick={() => navigate({ to: "/auth" })}
			>
				Login
			</button>
		);
	})();

	return (
		<>
			<div
				className={cn(
					"fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden",
					isOpen ? "opacity-100" : "pointer-events-none opacity-0"
				)}
				onClick={onClose}
				aria-hidden="true"
			/>
			<aside
				className={cn(
					"fixed left-0 top-0 z-50 flex h-screen w-80 flex-col border-r border-gray-200 bg-white dark:border-[#2a2a2a] dark:bg-[#1a1a1a]",
					"transition-transform duration-300 ease-in-out",
					isOpen ? "translate-x-0" : "-translate-x-full",
					"md:sticky md:z-30 md:translate-x-0"
				)}
			>
				<div className="flex items-center justify-center p-4">
					<h1 className="text-center text-lg font-medium text-gray-900 dark:text-[#e2e8f0]">
						masters.chat
					</h1>
				</div>
				<div className="flex flex-col gap-4 px-4 pb-4">
					<Button
						type="button"
						onClick={startNewChatAndClose}
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
							handleChatSelect={handleChatSelectAndClose}
							handlePinThread={handlePinThread}
							deleteThread={deleteThread}
							activeThread={activeThread}
						/>
					)}

					{recentUnpinned.length > 0 && (
						<ChatItemSection
							title="Last 30 Days"
							threads={recentUnpinned}
							handleChatSelect={handleChatSelectAndClose}
							handlePinThread={handlePinThread}
							deleteThread={deleteThread}
							activeThread={activeThread}
						/>
					)}

					{olderUnpinned.length > 0 && (
						<ChatItemSection
							title="Older"
							threads={olderUnpinned}
							handleChatSelect={handleChatSelectAndClose}
							handlePinThread={handlePinThread}
							deleteThread={deleteThread}
							activeThread={activeThread}
						/>
					)}
				</div>

				<div className="border-t border-gray-200 p-4 dark:border-[#2a2a2a]">
					{footerContent}
				</div>
			</aside>
		</>
	);
};

export default SideBar;
