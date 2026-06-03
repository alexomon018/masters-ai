"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageList, MobileHeader } from "@molecules";
import { cn } from "@/utils";
import { useUser } from "@clerk/clerk-react";
import SideBar from "../SideBar/SideBar";
import useChat from "./useChat";
import ChatForm from "../ChatForm/ChatForm";

interface ChatProps {
	threadId: string;
	isNewThread: boolean;
}

const Chat = React.memo(({ threadId, isNewThread }: ChatProps) => {
	const formRef = useRef<HTMLFormElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const { user, isLoaded } = useUser();

	const {
		messages,
		isEmpty,
		input,
		handleInputChange,
		handleSubmit,
		submitMessage,
		streaming,
		loading,
		threadId: activeThreadId
	} = useChat({ threadId, isNewThread });

	useEffect(() => {
		document.body.style.overflow = sidebarOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [sidebarOpen]);

	const onClickQuestion = useCallback(
		(value: string) => {
			submitMessage(value);
		},
		[submitMessage]
	);

	// Auto-scroll only when the user is already near the bottom. Coalesce
	// streamed-chunk updates with rAF so we do at most one scrollTop write
	// per frame (forcing layout on every chunk was the source of the lag).
	const wasAtBottomRef = useRef(true);
	const scrollScheduledRef = useRef(false);
	const handleScroll = () => {
		const el = scrollContainerRef.current;
		if (!el) return;
		const distanceFromBottom =
			el.scrollHeight - el.scrollTop - el.clientHeight;
		wasAtBottomRef.current = distanceFromBottom < 60;
	};

	useEffect(() => {
		if (scrollScheduledRef.current) {
			return undefined;
		}
		scrollScheduledRef.current = true;
		const raf = requestAnimationFrame(() => {
			scrollScheduledRef.current = false;
			const el = scrollContainerRef.current;
			if (!el) return;
			if (wasAtBottomRef.current) {
				el.scrollTop = el.scrollHeight;
			}
		});
		return () => cancelAnimationFrame(raf);
	}, [messages, loading]);

	const onSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			handleSubmit(e);
		},
		[handleSubmit]
	);

	const showInitialQuestions = isEmpty && !streaming;

	return (
		<div className="flex h-full">
			<MobileHeader
				onOpenSidebar={() => setSidebarOpen(true)}
				user={user}
				isLoaded={isLoaded}
			/>
			<SideBar
				activeThreadId={activeThreadId}
				isOpen={sidebarOpen}
				onClose={() => setSidebarOpen(false)}
			/>
			<main
				className={cn(
					"relative mx-auto flex max-w-screen-md flex-1 flex-col overflow-hidden px-4 pt-16 md:px-6 md:pt-6"
				)}
			>
				<div
					ref={scrollContainerRef}
					onScroll={handleScroll}
					className="scrollbar-hide flex-1 overflow-y-auto overflow-x-hidden"
				>
					{isEmpty && (
						<div className="mb-4 flex w-full items-start gap-3 rounded-2xl p-3 md:gap-4 md:p-5">
							<p className="text-base">
								<strong>Welcome to Masters Chat</strong>{" "}
								Your ultimate companion in navigating Frontend Masters
								courses.
							</p>
						</div>
					)}
					<MessageList messages={messages} loading={loading} />
				</div>
				<ChatForm
					formRef={formRef as React.RefObject<HTMLFormElement>}
					onSubmit={onSubmit}
					input={input}
					handleInputChange={handleInputChange}
					streaming={streaming}
					showInitialQuestions={showInitialQuestions}
					onClickQuestion={onClickQuestion}
				/>
			</main>
		</div>
	);
});

export default Chat;
