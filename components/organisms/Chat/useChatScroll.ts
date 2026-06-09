import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";

interface Args {
	messages: UIMessage[];
}

/**
 * ChatGPT/Claude-style scroll behavior.
 *
 * On a new user message we smooth-scroll that message to the TOP of the
 * viewport. A min-height spacer (rendered after the last turn by MessageList)
 * reserves a viewport's worth of room below, so the streaming reply fills the
 * space under the user message WITHOUT the viewport jumping around per token —
 * which is what makes the streaming feel calm rather than "harsh".
 *
 * We deliberately don't pin-to-bottom during streaming: once the user message
 * is parked at the top, the reply grows into the reserved space below it, and
 * the user stays in control of scrolling from there.
 */
const useChatScroll = ({ messages }: Args) => {
	const containerRef = useRef<HTMLDivElement>(null);
	// Last user-message count, to detect a fresh send.
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
