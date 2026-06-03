import {
	createFileRoute,
	Outlet,
	useLocation,
	useParams
} from "@tanstack/react-router";
import { useRef, useState } from "react";
import Chat from "@/components/organisms/Chat/Chat";

// Pathless layout owning the single persistent <Chat> for both `/` and
// `/chat/$id`. Rendering Chat above the outlet lets the home→thread URL swap
// happen without remounting the tree (which would drop the agent WebSocket).
const ChatHost = () => {
	const { pathname } = useLocation();
	const params = useParams({ strict: false });

	// Home ("new chat") id. Reminted whenever we arrive at "/" from elsewhere so
	// the keyed <Chat> remounts clean — but NOT on the first-message swap
	// "/" → "/chat/<id>", where the param id equals the minted id, so the key is
	// unchanged and the live connection survives.
	const [seedHomeId] = useState(() => crypto.randomUUID());
	const homeIdRef = useRef<string>(seedHomeId);
	const prevPathnameRef = useRef<string>(pathname);
	if (pathname === "/" && prevPathnameRef.current !== "/") {
		homeIdRef.current = crypto.randomUUID();
	}
	prevPathnameRef.current = pathname;

	const threadId = params.id ?? homeIdRef.current;
	const isNewThread = !params.id;

	return <Chat key={threadId} threadId={threadId} isNewThread={isNewThread} />;
};

const ChatLayout = () => (
	<>
		<ChatHost />
		<Outlet />
	</>
);

export const Route = createFileRoute("/_chat")({
	component: ChatLayout
});
