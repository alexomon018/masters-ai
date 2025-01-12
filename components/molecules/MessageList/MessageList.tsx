import { Message as MessageProps } from "ai/react";
import { MessageLoader } from "@atoms";
import Message from "../Message/Message";

interface MessageListProps {
	messages: MessageProps[];
	streaming: boolean;
	messagesEndRef: React.RefObject<HTMLDivElement>;
}

const MessageList = ({
	messages,
	streaming,
	messagesEndRef
}: MessageListProps) => (
	<>
		{messages.map((message: MessageProps) => (
			<Message key={message.id} {...message} />
		))}
		{streaming && <MessageLoader />}
		<div ref={messagesEndRef} />
	</>
);

export default MessageList;
