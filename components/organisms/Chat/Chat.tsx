"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageList, MobileHeader } from "@molecules";
import { cn } from "@/utils";
import { useUser } from "@clerk/nextjs";
import type { VListHandle } from "virtua";
import SideBar from "../SideBar/SideBar";
import useAskChat from "./useAskChat";
import ChatForm from "../ChatForm/ChatForm";

const Chat = React.memo(({ threadId }: { threadId: string }) => {
	const formRef = useRef<HTMLFormElement>(null);
	const listRef = useRef<VListHandle>(null);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const { user, isLoaded } = useUser();

	const {
		messages,
		input,
		handleInputChange,
		handleSubmit,
		setInput,
		streaming,
		setStreaming,
		loading,
		activeThread
	} = useAskChat(threadId);

	useEffect(() => {
		document.body.style.overflow = sidebarOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [sidebarOpen]);

	const onClickQuestion = useCallback(
		(value: string) => {
			setInput(value);
			setTimeout(() => {
				formRef.current?.dispatchEvent(
					new Event("submit", { cancelable: true, bubbles: true })
				);
			}, 1);
		},
		[setInput]
	);

	const prevMessageCountRef = useRef(messages.length);

	useEffect(() => {
		if (!listRef.current || messages.length === 0) return;
		const prevCount = prevMessageCountRef.current;
		prevMessageCountRef.current = messages.length;

		// Only auto-scroll when new messages are added or loading starts
		const hasNewMessages = messages.length > prevCount;
		if (!hasNewMessages && !loading) return;

		const totalItems = messages.length + (loading ? 1 : 0) + 1;
		listRef.current.scrollToIndex(totalItems - 1, {
			align: "end"
		});
	}, [messages, loading]);

	const onSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			handleSubmit(e);
			setStreaming(true);
		},
		[handleSubmit, setStreaming]
	);

	return (
		<div className="flex h-full overflow-hidden">
			<MobileHeader
				onOpenSidebar={() => setSidebarOpen(true)}
				user={user}
				isLoaded={isLoaded}
			/>
			<SideBar
				activeThread={activeThread || null}
				isOpen={sidebarOpen}
				onClose={() => setSidebarOpen(false)}
			/>
			<main
				className={cn(
					"relative mx-auto flex max-w-screen-md flex-1 flex-col overflow-hidden px-4 pt-16 md:px-6 md:pt-6"
				)}
			>
				<MessageList
					messages={messages}
					loading={loading}
					listRef={listRef as React.RefObject<VListHandle>}
				/>
				<ChatForm
					formRef={formRef as React.RefObject<HTMLFormElement>}
					onSubmit={onSubmit}
					input={input}
					handleInputChange={handleInputChange}
					streaming={streaming}
					showInitialQuestions={messages.length === 1 && !streaming}
					onClickQuestion={onClickQuestion}
				/>
			</main>
		</div>
	);
});

export default Chat;
