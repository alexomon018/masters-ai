import { ReactNode } from "react";

interface ChatLayoutProps {
	children: ReactNode;
}

const ChatLayout = ({ children }: ChatLayoutProps) => (
	<div className="flex h-screen flex-col">
		<main className="flex-1 overflow-hidden">{children}</main>
	</div>
);

export default ChatLayout;
