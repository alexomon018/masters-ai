import type { ChatMessage as MessageProps } from "@/components/organisms/Chat/useAskChat";
import { MessageLoader } from "@atoms";
import { VList, type VListHandle } from "virtua";
import Message from "../Message/Message";

interface MessageListProps {
	messages: MessageProps[];
	loading: boolean;
	listRef: React.RefObject<VListHandle>;
}

const MessageList = ({
	messages,
	loading,
	listRef
}: MessageListProps) => (
	<VList
		ref={listRef}
		className="scrollbar-hide flex-1 overflow-x-hidden"
		style={{ width: "100%" }}
	>
		{messages.map((message: MessageProps) => (
			<Message key={message.id} {...message} />
		))}
		{loading && <MessageLoader />}
		<div style={{ height: 1 }} aria-hidden />
	</VList>
);

export default MessageList;
