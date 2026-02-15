"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { MessageList, InitialQuestions } from "@molecules";
import { cn } from "@/utils";
import { ThemeToggle } from "@atoms";
import SideBar from "../SideBar/SideBar";
import useAskChat from "./useAskChat";
import ChatForm from "../ChatForm/ChatForm";

const Chat = React.memo(({ threadId }: { threadId: string }) => {
	const formRef = useRef<HTMLFormElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

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
		<div className="flex min-h-svh">
			<div className="absolute right-4 top-4 z-10">
				<ThemeToggle />
			</div>
			<SideBar activeThread={activeThread || null} />
			<main
				className={cn(
					"relative mx-auto max-w-screen-md flex-1 overflow-y-auto p-4 !pb-32 md:p-6 md:!pb-40"
				)}
			>
				<div className="flex h-full flex-col">
					<div className="flex-1">
						<MessageList
							messages={messages}
							streaming={streaming}
							messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
						/>
					</div>
					{messages.length === 1 && !streaming && (
						<div className="my-5">
							<InitialQuestions onClickQuestion={onClickQuestion} />
						</div>
					)}
				</div>
				<ChatForm
					formRef={formRef as React.RefObject<HTMLFormElement>}
					onSubmit={onSubmit}
					input={input}
					handleInputChange={handleInputChange}
					streaming={streaming}
				/>
			</main>
		</div>
	);
});

export default Chat;
