import { createFileRoute, useParams } from "@tanstack/react-router";

// `/chat/$id` — direct-link / refresh entry for a thread. Scaffold
// placeholder. The component port adds the v4-UUID guard (notFound on a bad
// id) and renders <Chat threadId={id} />.
const ChatThreadPage = () => {
	const { id } = useParams({ from: "/chat/$id" });
	return (
		<div className="flex h-full items-center justify-center text-muted-foreground">
			Chat route (scaffold): {id}
		</div>
	);
};

export const Route = createFileRoute("/chat/$id")({
	component: ChatThreadPage
});
