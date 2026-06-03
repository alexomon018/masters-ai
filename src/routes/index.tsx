import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Chat from "@/components/organisms/Chat/Chat";

// Home (`/`). Mints a fresh thread id once per mount and hands it to <Chat>
// pre-flagged as new — the agent connection opens against this id eagerly, so
// the first sendMessage hits the right DO with no remount. On submit, useChat
// swaps the URL to /chat/<id> without unmounting the chat tree.
//
// SSR is irrelevant here (pure SPA): useAgentChat resolves its initial
// messages on the client, which is exactly what the old `ssr: false` dynamic
// import was working around under Next.
const HomePage = () => {
	const [threadId] = useState(() => crypto.randomUUID());
	return <Chat threadId={threadId} isNewThread />;
};

export const Route = createFileRoute("/")({
	component: HomePage
});
