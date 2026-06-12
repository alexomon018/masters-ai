import { useRef } from "react";
import ChatForm from "../ChatForm/ChatForm";

const noop = () => {};

const ChatPlaceholder = () => {
	const formRef = useRef<HTMLFormElement>(null);

	return (
		<main className="relative mx-auto flex max-w-screen-md flex-1 flex-col overflow-hidden px-4 pt-16 md:px-6 md:pt-6">
			<div className="scrollbar-hide flex-1 overflow-y-auto overflow-x-hidden" />
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
