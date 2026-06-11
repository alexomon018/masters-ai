import React, { useCallback, useRef } from "react";
import { MessageList } from "@molecules";
import useChat from "./useChat";
import useChatScroll from "./useChatScroll";
import ChatForm from "../ChatForm/ChatForm";

interface ChatProps {
	threadId: string;
	isNewThread: boolean;
}

// Conversation pane only. The persistent shell (SideBar, MobileHeader) lives in
// the `_chat` layout so that selecting another thread — which changes the route
// param and so this component's key — remounts only the conversation, not the
// whole page.
const Chat = React.memo(({ threadId, isNewThread }: ChatProps) => {
	const formRef = useRef<HTMLFormElement>(null);

	const {
		messages,
		isEmpty,
		input,
		handleInputChange,
		handleSubmit,
		submitMessage,
		streaming,
		loading
	} = useChat({ threadId, isNewThread });

	const { containerRef: scrollContainerRef } = useChatScroll({ messages });

	const onClickQuestion = useCallback(
		(value: string) => {
			submitMessage(value);
		},
		[submitMessage]
	);

	const onSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			handleSubmit(e);
		},
		[handleSubmit]
	);

	const showInitialQuestions = isEmpty && !streaming;

	return (
		<main className="relative mx-auto flex max-w-screen-md flex-1 flex-col overflow-hidden px-4 pt-16 md:px-6 md:pt-6">
			<div
				ref={scrollContainerRef}
				className="scrollbar-hide flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
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
				<MessageList
					messages={messages}
					loading={loading}
					streaming={streaming}
				/>
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
	);
});

export default Chat;
