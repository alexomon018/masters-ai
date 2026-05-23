import type { UIMessage } from "ai";
import { MessageLoader } from "@atoms";
import Message from "../Message/Message";

interface MessageListProps {
	messages: UIMessage[];
	loading: boolean;
}

const MessageList = ({ messages, loading }: MessageListProps) => (
	<div className="flex w-full flex-col">
		{messages.map((message) => (
			<Message key={message.id} message={message} />
		))}
		{loading && <MessageLoader />}
	</div>
);

export default MessageList;
