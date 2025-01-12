import React from "react";
import { cn } from "@utils";
import { AllSidesIcon } from "@radix-ui/react-icons";

interface SideBarProps {
	isSidebarOpen: boolean;
	setIsSidebarOpen: (isSidebarOpen: boolean) => void;
}

const SideBar = ({ isSidebarOpen, setIsSidebarOpen }: SideBarProps) => (
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
					{[1, 2, 3].map((chat) => (
						<div
							key={chat}
							className="cursor-pointer p-4 transition-colors hover:bg-gray-50"
						>
							<div className="mb-1 flex items-start justify-between">
								<h3 className="font-medium">Chat #{chat}</h3>
								<span className="text-xs text-gray-500">2h ago</span>
							</div>
							<p className="truncate text-sm text-gray-600">
								Last message preview goes here...
							</p>
						</div>
					))}
				</div>
			)}
		</aside>
	</>
);

export default SideBar;
