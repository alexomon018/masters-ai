"use client";

import dynamic from "next/dynamic";
import { notFound, useParams } from "next/navigation";
import QueryClientProvider from "@/providers/queryClientProvider";

// Direct-link / refresh on /chat/<id>. The id is treated as existing on
// the worker — useChat will fetch its message history. After a fresh
// chat is started on `/`, replaceState swaps the URL to /chat/<id>
// without remounting, so this route is only hit on hard navigation.

// Lowercase v4 UUID — the only shape `crypto.randomUUID()` produces on the
// home page. Reject anything else at the route boundary so a stray
// `/chat/javascript:alert(1)` can't open a WS upgrade against the worker
// or be reflected unsanitized into the page.
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// SSR disabled — see app/page.tsx for the same reason.
const Chat = dynamic(() => import("@/components/organisms/Chat/Chat"), {
	ssr: false
});

const ChatThreadPage = () => {
	const params = useParams<{ id: string }>();
	const { id } = params;

	if (!id || !UUID_RE.test(id)) {
		notFound();
	}

	return (
		<QueryClientProvider>
			<Chat key={id} threadId={id} isNewThread={false} />
		</QueryClientProvider>
	);
};

export default ChatThreadPage;
