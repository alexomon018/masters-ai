import { DEX_Thread } from "@/localdb/dexie";
import { cn } from "@utils";
import { PinIcon, XIcon } from "lucide-react";
import React from "react";

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

export default ChatItem;
