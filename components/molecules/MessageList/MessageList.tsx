import type { UIMessage } from "ai";
import { MessageLoader } from "@atoms";
import Message from "../Message/Message";

interface MessageListProps {
	messages: UIMessage[];
	loading: boolean;
	streaming: boolean;
}

const MessageList = ({ messages, loading, streaming }: MessageListProps) => (
	<div className="flex w-full flex-col">
		{messages.map((message) => (
			<Message key={message.id} message={message} />
		))}
		{loading && <MessageLoader />}
		{/*
		 * Spacer reserving a viewport's worth of room below the last turn so a
		 * freshly-sent user message can be scrolled to the top (see useChatScroll)
		 * even when the reply is short. Only present WHILE streaming — once the
		 * reply completes it collapses, so a finished conversation doesn't leave a
		 * permanent block of empty space at the bottom.
		 */}
		{streaming && <div aria-hidden className="min-h-[60vh] shrink-0" />}
	</div>
);

export default MessageList;
