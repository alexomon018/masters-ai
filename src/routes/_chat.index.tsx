import { createFileRoute } from "@tanstack/react-router";

// Home (`/`). The persistent <Chat> is rendered by the _chat layout; this
// index match just signals "new chat" mode (no thread id in the URL).
const HomeIndex = () => null;

export const Route = createFileRoute("/_chat/")({
	component: HomeIndex
});
