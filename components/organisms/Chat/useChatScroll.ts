import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";

interface Args {
	messages: UIMessage[];
}

const useChatScroll = ({ messages }: Args) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const userCountRef = useRef(0);

	const userMessageCount = messages.reduce(
		(n, m) => (m.role === "user" ? n + 1 : n),
		0
	);

	useEffect(() => {
		if (userMessageCount <= userCountRef.current) {
			userCountRef.current = userMessageCount;
			return;
		}
		userCountRef.current = userMessageCount;

		const el = containerRef.current;
		if (!el) return;

		// Bring the latest user message to the top of the scroll viewport.
		const userEls = el.querySelectorAll<HTMLElement>('[data-role="user"]');
		const lastUser = userEls[userEls.length - 1];
		if (!lastUser) return;

		const top = lastUser.offsetTop - el.offsetTop;
		el.scrollTo({ top, behavior: "smooth" });
	}, [userMessageCount]);

	return { containerRef };
};

export default useChatScroll;
