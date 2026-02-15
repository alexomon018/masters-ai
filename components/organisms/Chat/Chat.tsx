"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageList, MobileHeader } from "@molecules";
import { cn } from "@/utils";
import { useUser } from "@clerk/nextjs";
import SideBar from "../SideBar/SideBar";
import useAskChat from "./useAskChat";
import ChatForm from "../ChatForm/ChatForm";

const Chat = React.memo(({ threadId }: { threadId: string }) => {
	const formRef = useRef<HTMLFormElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
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

	useEffect(() => {
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	const onSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			handleSubmit(e);
			setStreaming(true);
		},
		[handleSubmit, setStreaming]
	);

	return (
		<div className="flex min-h-svh">
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
					"relative mx-auto max-w-screen-md flex-1 overflow-y-auto p-4 pt-16 !pb-28 md:p-6 md:pt-6"
				)}
			>
				<MessageList
					messages={messages}
					streaming={streaming}
					messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
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
