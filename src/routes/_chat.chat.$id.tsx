import { createFileRoute, notFound } from "@tanstack/react-router";

// v4 UUID guard — reject anything else at the route boundary so a stray
// `/chat/javascript:alert(1)` can't reach the worker or be reflected.
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// `/chat/$id`. <Chat> is rendered by the _chat layout; this match only
// enforces the UUID guard.
const ChatThread = () => null;

export const Route = createFileRoute("/_chat/chat/$id")({
	beforeLoad: ({ params }) => {
		if (!params.id || !UUID_RE.test(params.id)) {
			throw notFound();
		}
	},
	component: ChatThread
});
