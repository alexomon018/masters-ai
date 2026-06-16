import { useRef } from "react";
import type { UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { MessageList } from "@molecules";
import { queryKeys } from "@constants";
import type { FeedbackEntry } from "./helpers";
import ChatForm from "../ChatForm/ChatForm";

const noop = () => {};

// Suspense fallback for the keyed <Chat>. While the incoming thread's agent
// connection suspends (auth query + socket + initial messages), render its
// cached conversation so switching threads never blanks the message pane —
// only the input stays inert until the live chat mounts.
const ChatPlaceholder = ({ threadId }: { threadId?: string }) => {
	const formRef = useRef<HTMLFormElement>(null);
	const queryClient = useQueryClient();
	const cachedMessages = threadId
		? queryClient.getQueryData<UIMessage[]>(
				queryKeys.threadMessages(threadId)
			)
		: undefined;
	const cachedFeedback =
		(threadId
			? queryClient.getQueryData<Record<string, FeedbackEntry>>(
					queryKeys.threadFeedback(threadId)
				)
			: undefined) ?? {};

	return (
		<main className="relative mx-auto flex max-w-screen-md flex-1 flex-col overflow-hidden px-4 pt-16 md:px-6 md:pt-6">
			{cachedMessages && cachedMessages.length > 0 ? (
				<MessageList
					messages={cachedMessages}
					loading={false}
					streaming={false}
					threadId={threadId ?? ""}
					feedbackMap={cachedFeedback}
				/>
			) : (
				<div className="flex-1" />
			)}
			<ChatForm
				formRef={formRef}
				onSubmit={noop}
				input=""
				handleInputChange={noop}
				streaming
			/>
		</main>
	);
};

export default ChatPlaceholder;
