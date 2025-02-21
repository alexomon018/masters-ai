"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageList, InitialQuestions } from "@molecules";
import { cn } from "@/utils";
import SideBar from "../SideBar/SideBar";
import useAskChat from "./useAskChat";
import ChatForm from "../ChatForm/ChatForm";

const SidebarOverlay = React.memo(
	({
		isSidebarOpen,
		setIsSidebarOpen
	}: {
		isSidebarOpen: boolean;
		setIsSidebarOpen: (open: boolean) => void;
	}) => {
		if (!isSidebarOpen) return null;

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					setIsSidebarOpen(false);
				}
			},
			[setIsSidebarOpen]
		);

		return (
			<div
				className="fixed inset-0 z-20 bg-black/20 md:hidden"
				onClick={() => setIsSidebarOpen(false)}
				role="button"
				tabIndex={0}
				onKeyDown={handleKeyDown}
			/>
		);
	}
);

const Chat = React.memo(({ threadId }: { threadId: string }) => {
	const formRef = useRef<HTMLFormElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
		<div className="flex min-h-svh bg-[#F8FAFF]">
			<SideBar
				isSidebarOpen={isSidebarOpen}
				setIsSidebarOpen={setIsSidebarOpen}
				activeThread={activeThread || null}
			/>
			<main
				className={cn(
					"relative mx-auto max-w-screen-md flex-1 overflow-y-auto p-4 !pb-32 md:p-6 md:!pb-40"
				)}
			>
				<SidebarOverlay
					isSidebarOpen={isSidebarOpen}
					setIsSidebarOpen={setIsSidebarOpen}
				/>

				<div className="w-full h-full">
					<MessageList
						messages={messages}
						streaming={streaming}
						messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
					/>
					{messages.length === 0 && (
						<InitialQuestions onClickQuestion={onClickQuestion} />
					)}
				</div>
				<ChatForm
					formRef={formRef as React.RefObject<HTMLFormElement>}
					onSubmit={onSubmit}
					input={input}
					handleInputChange={handleInputChange}
					streaming={streaming}
					isSidebarOpen={isSidebarOpen}
				/>
			</main>
		</div>
	);
});

export default Chat;
