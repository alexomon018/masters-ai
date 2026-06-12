import { createFileRoute } from "@tanstack/react-router";

// Home (`/`). <Chat> is rendered by the _chat layout; this match just marks
// "new chat" mode (no thread id in the URL).
const HomeIndex = () => null;

export const Route = createFileRoute("/_chat/")({
	component: HomeIndex
});
