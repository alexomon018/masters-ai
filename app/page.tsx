"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import QueryClientProvider from "@/providers/queryClientProvider";

// Home page. Mints a fresh thread id once per mount and hands it to <Chat>
// pre-flagged as new. The agent connection opens against this id eagerly,
// so the first sendMessage hits the right DO with no remount. On submit,
// useChat does `history.replaceState('/chat/<id>')` to make the URL
// reflect reality without unmounting the chat tree.
//
// SSR is disabled for <Chat> because `useAgentChat` resolves its initial
// messages during render via React's `use()` hook — fetching localhost
// from the Next server is unreachable / racy, and rendering the empty
// shell on the server diverges from the client's fetched-history paint
// (hydration mismatch). Disabling SSR keeps SSR HTML and the first client
// paint identical (both empty until the client-side fetch resolves).
const Chat = dynamic(() => import("@/components/organisms/Chat/Chat"), {
	ssr: false
});

const HomePage = () => {
	const [threadId] = useState(() => crypto.randomUUID());

	return (
		<QueryClientProvider>
			<Chat threadId={threadId} isNewThread />
		</QueryClientProvider>
	);
};

export default HomePage;
