import { createFileRoute, notFound, useParams } from "@tanstack/react-router";
import Chat from "@/components/organisms/Chat/Chat";

// Lowercase v4 UUID — the only shape crypto.randomUUID() produces on the home
// page. Reject anything else at the route boundary so a stray
// `/chat/javascript:alert(1)` can't open a WS upgrade against the worker or be
// reflected unsanitized into the page.
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Direct-link / refresh on /chat/<id>. The id is treated as existing on the
// worker — useChat fetches its message history. After a fresh chat starts on
// `/`, the URL swap lands here on a hard navigation only.
const ChatThreadPage = () => {
	const { id } = useParams({ from: "/chat/$id" });
	return <Chat key={id} threadId={id} isNewThread={false} />;
};

export const Route = createFileRoute("/chat/$id")({
	beforeLoad: ({ params }) => {
		if (!params.id || !UUID_RE.test(params.id)) {
			throw notFound();
		}
	},
	component: ChatThreadPage
});
