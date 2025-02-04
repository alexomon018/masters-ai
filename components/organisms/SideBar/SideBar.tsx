"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@utils";
import { AllSidesIcon, ChatBubbleIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
	const [chats, setChats] = useState<Chat[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const router = useRouter();

	useEffect(() => {
		const fetchChats = async () => {
			try {
				const response = await fetch("/api/chats"); // Adjust the endpoint as needed
				const data = await response.json();
				setChats(data);
			} catch (error) {
				console.error("Failed to fetch chats:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchChats();
	}, []);

	const startNewChat = async () => {
		try {
			const response = await fetch("/api/chats", {
				method: "POST"
			});

			if (!response.ok) {
				throw new Error("Failed to create chat");
			}

			const { id } = await response.json();
			router.push(`/chat/${id}`);
		} catch (error) {
			console.error("Failed to create chat:", error);
			// You might want to show an error message to the user here
		}
	};

	const renderChatList = () => {
		if (isLoading) {
			return (
				<div className="p-4 text-center text-gray-500">Loading chats...</div>
			);
		}

		if (chats.length === 0) {
			return <div className="p-4 text-center text-gray-500">No chats yet</div>;
		}

		return chats.map((chat) => (
			<Link
				key={chat.id}
				href={`/chat/${chat.id}`}
				className="cursor-pointer p-4 outline-none transition-colors hover:bg-gray-50"
			>
				<div className="mb-1 flex items-start justify-between">
					<h3 className="font-medium">{chat.title}</h3>
					<span className="text-xs text-gray-500">
						{chat.createdAt.toString()}
					</span>
				</div>
				<p className="truncate text-sm text-gray-600">{chat.id}</p>
			</Link>
		));
	};

	return (
		<>
			{!isSidebarOpen && (
				<button
					type="button"
					className="fixed left-4 top-4 z-30 rounded-lg border border-gray-200 bg-white p-2 shadow-sm md:hidden"
					onClick={() => setIsSidebarOpen(true)}
				>
					<AllSidesIcon className="size-6" />
				</button>
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
						!isSidebarOpen && "justify-center"
					)}
				>
					{isSidebarOpen && (
						<h2 className="flex-1 text-xl font-semibold">Chat History</h2>
					)}
					<button
						type="button"
						className="mr-5 size-6 cursor-pointer"
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
					<div className="divide-y divide-gray-200">{renderChatList()}</div>
				)}
			</aside>
		</>
	);
};

export default SideBar;
