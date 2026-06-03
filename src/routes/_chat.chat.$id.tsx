import { createFileRoute, notFound } from "@tanstack/react-router";

// Lowercase v4 UUID — the only shape crypto.randomUUID() produces. Reject
// anything else at the route boundary so a stray `/chat/javascript:alert(1)`
// can't open a WS upgrade against the worker or be reflected into the page.
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// `/chat/$id`. The persistent <Chat> is rendered by the _chat layout (which
// reads this route's `id` param); this match only enforces the UUID guard.
const ChatThread = () => null;

export const Route = createFileRoute("/_chat/chat/$id")({
	beforeLoad: ({ params }) => {
		if (!params.id || !UUID_RE.test(params.id)) {
			throw notFound();
		}
	},
	component: ChatThread
});
