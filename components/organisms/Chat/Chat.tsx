import React, { useCallback, useRef } from "react";
import { MessageList } from "@molecules";
import useChat from "./useChat";
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
		loading,
		feedbackMap
	} = useChat({ threadId, isNewThread });

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
			{isEmpty ? (
				<div className="flex-1">
					<div className="mb-4 flex w-full items-start gap-3 rounded-2xl p-3 md:gap-4 md:p-5">
						<p className="text-base">
							<strong>Welcome to Masters Chat</strong> Your ultimate
							companion in navigating Frontend Masters courses.
						</p>
					</div>
				</div>
			) : (
				<MessageList
					messages={messages}
					loading={loading}
					streaming={streaming}
					threadId={threadId}
					feedbackMap={feedbackMap}
				/>
			)}
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
