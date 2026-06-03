"use client";

import React from "react";
import { Menu } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@atoms";
import { useNavigate } from "@tanstack/react-router";
import type { UserResource } from "@clerk/types";

interface MobileHeaderProps {
	onOpenSidebar: () => void;
	user: UserResource | null | undefined;
	isLoaded: boolean;
}

const MobileHeader = ({ onOpenSidebar, user, isLoaded }: MobileHeaderProps) => {
	const navigate = useNavigate();

	return (
		<header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-white px-4 py-3 dark:bg-[#1a1a1a] md:hidden">
			<button
				type="button"
				onClick={onOpenSidebar}
				className="rounded-full p-2 text-gray-700 hover:bg-gray-100 dark:text-[#e2e8f0] dark:hover:bg-[#2a2a2a]"
				aria-label="Open sidebar"
			>
				<Menu className="size-6" />
			</button>

			<h1 className="text-lg font-medium text-gray-900 dark:text-[#e2e8f0]">
				masters.chat
			</h1>

			{isLoaded && user ? (
				<button
					type="button"
					onClick={() =>
						navigate({ to: "/settings/$tab", params: { tab: "account" } })
					}
					className="rounded-full"
					aria-label="User settings"
				>
					<Avatar className="size-8">
						<AvatarImage src={user.imageUrl} alt="User avatar" />
						<AvatarFallback className="bg-gray-100 text-gray-700 dark:bg-[#2a2a2a] dark:text-[#e2e8f0]">
							{user.fullName?.charAt(0) || user.username?.charAt(0)}
						</AvatarFallback>
					</Avatar>
				</button>
			) : (
				<div className="size-8" />
			)}
		</header>
	);
};

export default MobileHeader;
