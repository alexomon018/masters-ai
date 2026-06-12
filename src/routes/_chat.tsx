import {
	createFileRoute,
	Outlet,
	useLocation,
	useParams
} from "@tanstack/react-router";
import { Suspense, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { MobileHeader } from "@molecules";
import { threadsQueryOptions } from "@hooks";
import {
	authReadyForPrefetch,
	getClerkToken
} from "@/components/organisms/Chat/helpers/agentAuth";
import Chat from "@/components/organisms/Chat/Chat";
import ChatPlaceholder from "@/components/organisms/Chat/ChatPlaceholder";
import SideBar from "@/components/organisms/SideBar/SideBar";

// Pathless layout owning the persistent chat shell — SideBar + MobileHeader —
// for both `/` and `/chat/$id`. Keeping the shell here (above the keyed <Chat>)
// means selecting another thread remounts only the conversation pane, not the
// whole page, and the home→thread URL swap doesn't drop the agent WebSocket.
const ChatHost = () => {
	const { pathname } = useLocation();
	const params = useParams({ strict: false });

	const { user, isLoaded } = useUser();
	const [sidebarOpen, setSidebarOpen] = useState(false);

	useEffect(() => {
		document.body.style.overflow = sidebarOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [sidebarOpen]);

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

	return (
		<div className="flex h-full">
			<MobileHeader
				onOpenSidebar={() => setSidebarOpen(true)}
				user={user}
				isLoaded={isLoaded}
			/>
			<SideBar
				activeThreadId={threadId}
				isOpen={sidebarOpen}
				onClose={() => setSidebarOpen(false)}
			/>
			{/*
			 * Own Suspense boundary around the keyed <Chat>. Switching threads
			 * remounts <Chat>, and useAgentChat `use()`s the initial-messages
			 * fetch — which suspends. Without a boundary here the suspension
			 * bubbles to the router and blanks the whole page (sidebar included).
			 * The fallback mirrors Chat's frame (empty message area + inert input
			 * box) so the shell AND the input box stay put — only the message
			 * list area is empty for the brief moment the next thread loads.
			 */}
			<Suspense fallback={<ChatPlaceholder threadId={threadId} />}>
				<Chat key={threadId} threadId={threadId} isNewThread={isNewThread} />
			</Suspense>
		</div>
	);
};

const ChatLayout = () => (
	<>
		<ChatHost />
		<Outlet />
	</>
);

export const Route = createFileRoute("/_chat")({
	// Warm the threads cache (shown in the sidebar on every _chat route) before
	// the layout renders, and on hover via defaultPreload: "intent". Keyed by
	// queryKeys.threads() — the same key useThreadsQuery() reads, so the two
	// dedupe. Skipped until Clerk is ready so a signed-in user is never
	// prefetched as anon on a cold load (the component query covers that case).
	loader: ({ context }) => {
		if (!authReadyForPrefetch()) return undefined;
		return context.queryClient.ensureQueryData(
			threadsQueryOptions(getClerkToken)
		);
	},
	component: ChatLayout
});
