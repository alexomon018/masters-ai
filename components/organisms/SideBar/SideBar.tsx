import React, { useEffect, useState } from "react";
import { cn } from "@utils";
import { useRouter } from "next/navigation";
import { AllSidesIcon } from "@radix-ui/react-icons";

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

	return (
		<>
			{!isSidebarOpen && (
				// eslint-disable-next-line react/button-has-type
				<button
					onClick={() => setIsSidebarOpen(true)}
					className="fixed left-4 top-4 z-30 rounded-lg border border-gray-200 bg-white p-2 shadow-sm md:hidden"
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
						<h2 className="text-xl font-semibold">Chat History</h2>
					)}
					<AllSidesIcon
						className="size-6 cursor-pointer"
						onClick={() => setIsSidebarOpen(!isSidebarOpen)}
					/>
				</div>

				{isSidebarOpen && (
					<div className="divide-y divide-gray-200">
						{isLoading ? (
							<div className="p-4 text-center text-gray-500">
								Loading chats...
							</div>
						) : chats.length === 0 ? (
							<div className="p-4 text-center text-gray-500">No chats yet</div>
						) : (
							chats.map((chat) => (
								<div
									key={chat.id}
									className="cursor-pointer p-4 transition-colors hover:bg-gray-50"
									onClick={() => router.push(`/chat/${chat.id}`)}
								>
									<div className="mb-1 flex items-start justify-between">
										<h3 className="font-medium">{chat.title}</h3>
										<span className="text-xs text-gray-500">
											{chat.createdAt.toString()}
										</span>
									</div>
									<p className="truncate text-sm text-gray-600">{chat.id}</p>
								</div>
							))
						)}
					</div>
				)}
			</aside>
		</>
	);
};

export default SideBar;
