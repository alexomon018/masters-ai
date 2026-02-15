"use client";

import {
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandDialog
} from "@molecules";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { dxdb } from "@/localdb/dexie";
import { useRouter } from "next/navigation";

const SearchOverlay = ({
	setOpenSearch,
	openSearch
}: {
	setOpenSearch: (open: boolean) => void;
	openSearch: boolean;
}) => {
	const router = useRouter();
	const [search, setSearch] = useState("");
	const handleClose = () => {
		setOpenSearch(false);
	};

	const threads = useLiveQuery(() => dxdb.threads.toArray())!;
	const messages = useLiveQuery(() => dxdb.messages.toArray())!;

	// Filter threads based on search input and messages content
	const filteredThreads = useMemo(
		() =>
			threads?.filter((thread) => {
				// Check if thread title matches
				const titleMatch = thread.title
					?.toLowerCase()
					.includes(search.toLowerCase());

				// Check if any message in this thread matches
				const threadMessages =
					messages?.filter((msg) => msg.threadId === thread.id) ?? [];
				const messageMatch = threadMessages.some((msg) =>
					msg.content.toLowerCase().includes(search.toLowerCase())
				);

				return titleMatch || messageMatch;
			}) ?? [],
		[threads, messages, search]
	);

	// Get matching message preview with context and highlighting
	const getMessagePreview = useCallback(
		(threadId: string) => {
			if (!search) return null;

			const matchingMessage = messages?.find(
				(msg) =>
					msg.threadId === threadId &&
					msg.content.toLowerCase().includes(search.toLowerCase())
			);

			if (!matchingMessage) return null;

			const { content } = matchingMessage;
			const searchLower = search.toLowerCase();
			const contentLower = content.toLowerCase();
			const matchIndex = contentLower.indexOf(searchLower);

			if (matchIndex === -1) return null;

			// Extract context around the match (50 chars before and after)
			const contextStart = Math.max(0, matchIndex - 50);
			const contextEnd = Math.min(
				content.length,
				matchIndex + search.length + 50
			);

			// Add ellipsis if we're not at the start/end
			const prefix = contextStart > 0 ? "..." : "";
			const suffix = contextEnd < content.length ? "..." : "";

			// Split the context into three parts: before match, match, and after match
			const beforeMatch = content.slice(contextStart, matchIndex);
			const match = content.slice(matchIndex, matchIndex + search.length);
			const afterMatch = content.slice(matchIndex + search.length, contextEnd);

			return {
				beforeMatch: prefix + beforeMatch,
				match,
				afterMatch: afterMatch + suffix
			};
		},
		[messages, search]
	);

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpenSearch(true);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, [setOpenSearch]);

	return (
		<CommandDialog open={openSearch} onOpenChange={handleClose}>
			<CommandInput
				placeholder="Type a command or search..."
				value={search}
				onValueChange={setSearch}
			/>
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>
				{filteredThreads.length > 0 && (
					<>
						<CommandGroup heading="Threads">
							{filteredThreads.map((thread) => {
								const messagePreview = getMessagePreview(thread.id);
								return (
									<CommandItem
										key={thread.id}
										className="w-full"
										onSelect={() => {
											router.push(`/chat/${thread.id}`);
											handleClose();
										}}
									>
										<div className="flex w-full flex-col gap-1">
											<span className="font-medium">
												{thread.title || "Untitled Thread"}
											</span>
											{messagePreview && search && (
												<span className="w-full truncate text-sm text-gray-500">
													{messagePreview.beforeMatch}
													<span className="w-full rounded bg-yellow-200 px-0.5 dark:bg-yellow-900">
														{messagePreview.match}
													</span>
													{messagePreview.afterMatch}
												</span>
											)}
										</div>
									</CommandItem>
								);
							})}
						</CommandGroup>
						<CommandSeparator />
					</>
				)}
			</CommandList>
		</CommandDialog>
	);
};

export default SearchOverlay;
