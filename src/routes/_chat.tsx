import {
	createFileRoute,
	Outlet,
	useLocation,
	useParams
} from "@tanstack/react-router";
import { useRef, useState } from "react";
import Chat from "@/components/organisms/Chat/Chat";

// Pathless layout owning the single persistent <Chat> for both `/` (new chat)
// and `/chat/$id` (existing thread). Rendering Chat HERE — above the route
// outlet — is what lets the home→thread URL swap happen without remounting
// the chat tree (and tearing down the live agent WebSocket mid-stream).
const ChatHost = () => {
	const { pathname } = useLocation();
	const params = useParams({ strict: false });

	// Id for the home ("new chat") state. We mint a fresh one whenever we
	// arrive at "/" from elsewhere (New Chat / sidebar / post-delete), so the
	// keyed <Chat> remounts clean. We deliberately DON'T remint on the
	// first-message swap "/" → "/chat/<id>": there the param id equals the
	// minted id, so the key is unchanged and the connection is preserved.
	// (Adjusting a ref during render off the location is intentional — it's
	// derived state, not an effect.) The seed is lazily minted once via
	// useState rather than re-rolling crypto.randomUUID() on every render.
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
