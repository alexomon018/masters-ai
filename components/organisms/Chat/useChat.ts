import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { queryKeys } from "@constants";
import {
	useAutoNameThread,
	useQuotaInvalidation,
	useThreadMessagesSync,
	useTokenFn
} from "@hooks";
import { useModelStore } from "@/providers";
import { upsertThreadRemote } from "@/components/organisms/SideBar/threadsApi";
import {
	fetchThreadFeedback,
	getAnonId,
	readStoredAnonId,
	resolveAgentAuth,
	threadMessagesQueryOptions
} from "./helpers";

const THREADS_QUERY_KEY = queryKeys.threads();
const UNTITLED_THREAD_TITLE = "New Chat";

interface Args {
	threadId: string;
	isNewThread: boolean;
}

const useChat = ({ threadId, isNewThread }: Args) => {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [input, setInput] = useState("");

	const { user, isLoaded: userLoaded } = useUser();
	const { selectedModel } = useModelStore((state) => state);

	const isAnon = userLoaded && !user;

	// Static auth query for anon visitors. Passing an OBJECT (not a function)
	// to useAgent disables its async-query refresh machinery: that machinery's
	// onClose handler re-mints the query on every socket close, and because
	// partysocket's reconnect() itself dispatches a synthetic close event, the
	// two feed back into a close → re-mint → reconnect loop that severs chat
	// streams mid-turn. Signed-in users still need the function form (tickets
	// are single-use), but the anon id is stable so a static object is safe.
	const [anonQuery, setAnonQuery] = useState<Record<string, string> | null>(
		() => {
			const stored = readStoredAnonId();
			return stored ? { anonId: stored } : null;
		}
	);

	useEffect(() => {
		if (!isAnon || anonQuery) return undefined;
		let cancelled = false;
		getAnonId().then((anonId) => {
			if (!cancelled && anonId) setAnonQuery({ anonId });
		});
		return () => {
			cancelled = true;
		};
	}, [isAnon, anonQuery]);

	const isFirstSendRef = useRef(isNewThread);

	const isNewThreadRef = useRef(isNewThread);
	const frozenIsNewThread = isNewThreadRef.current;

	const tokenFn = useTokenFn();

	const userData = useMemo(() => {
		if (!user) return undefined;
		return {
			name: (user.unsafeMetadata.name as string) || "",
			occupation: (user.unsafeMetadata.occupation as string) || "",
			traits: (user.unsafeMetadata.traits as string) || "",
			preferences: (user.unsafeMetadata.preferences as string) || ""
		};
	}, [user]);

	const buildAuthQuery = useCallback(
		() => resolveAgentAuth(tokenFn),
		[tokenFn]
	);

	// Served through the TanStack Query cache so a thread revisited within
	// staleTime resolves instantly (no suspense flash). The sidebar hover
	// prefetch warms this same key.
	const fetchInitialMessagesWithAuth = useCallback(
		() => queryClient.fetchQuery(threadMessagesQueryOptions(tokenFn, threadId)),
		[queryClient, tokenFn, threadId]
	);

	const getInitialMessages = useMemo(
		() => (frozenIsNewThread ? null : fetchInitialMessagesWithAuth),
		[frozenIsNewThread, fetchInitialMessagesWithAuth]
	);

	const agent = useAgent({
		agent: "masters-chat-agent",
		name: threadId,
		host: import.meta.env.VITE_WORKER_URL,
		query: isAnon ? (anonQuery ?? undefined) : buildAuthQuery,
		// Hold the connection until the identity is settled: Clerk must have
		// loaded (so an eventual signed-in user is never connected as anon) and
		// an anon visitor must have an anon id to put in the static query.
		enabled: userLoaded && (!isAnon || anonQuery !== null),
		// Disable the library's periodic auth-query invalidation (default 5 min):
		// it suspends <Chat> and tears down a healthy socket just to mint a ticket
		// that is never re-sent. onClose still clears the cache, so every real
		// reconnect gets a fresh single-use ticket. Must stay under the 2^31-1 ms
		// setTimeout cap or the timer fires immediately.
		cacheTtl: 2_000_000_000
	});

	const {
		messages: agentMessages,
		sendMessage,
		setMessages,
		status,
		stop
	} = useAgentChat({
		agent,
		getInitialMessages,
		// Coalesce streamed-chunk store notifications: useAgentChat applies every
		// WS chunk via a synchronous setMessages, and dense bursts (long-chat
		// replays/resumes) cascade into nested re-renders until React throws
		// "Maximum update depth exceeded" (cloudflare/agents#1732). Throttling
		// batches them into at most one re-render per 50ms.
		experimental_throttle: 50,
		body: () => ({
			model: selectedModel.id,
			userData
		})
	});

	const isStreaming = status === "submitted" || status === "streaming";

	useThreadMessagesSync({
		threadId,
		agentMessages,
		isStreaming,
		setMessages
	});

	useQuotaInvalidation(isStreaming);
	useAutoNameThread({
		activeThreadId: threadId,
		agentMessages,
		isStreaming,
		modelId: selectedModel.id
	});

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value),
		[]
	);

	const runSubmit = useCallback(
		(rawText: string) => {
			const text = rawText.trim();
			if (!text) return;
			setInput("");

			// First send: register the thread and swap the URL to /chat/<id>. The
			// nav lands on the SAME id the layout keys <Chat> by, so the live agent
			// connection survives the URL change. Using navigate (not a raw
			// history.replaceState) keeps a later "New Chat" a real transition.
			if (isFirstSendRef.current) {
				isFirstSendRef.current = false;
				upsertThreadRemote(tokenFn, {
					threadId,
					title: UNTITLED_THREAD_TITLE,
					pinned: false,
					lastMessageAt: Date.now()
				})
					.then(() => {
						queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
					})
					.catch(() => {});
				navigate({
					to: "/chat/$id",
					params: { id: threadId },
					replace: true
				});
			}

			sendMessage({
				role: "user",
				parts: [{ type: "text", text }]
			});
		},
		[threadId, sendMessage, tokenFn, queryClient, navigate]
	);

	const handleSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			runSubmit(input);
		},
		[input, runSubmit]
	);

	const submitMessage = useCallback(
		(text: string) => {
			runSubmit(text);
		},
		[runSubmit]
	);

	const loading =
		isStreaming &&
		!agentMessages.some(
			(m: UIMessage) => m.role === "assistant" && (m.parts ?? []).length > 0
		);

	const isEmpty = agentMessages.length === 0;

	// One fetch per thread builds a { messageId -> feedback } map used to hydrate
	// the thumbs state in each Message. A new thread has no persisted feedback.
	const { data: feedbackMap = {} } = useQuery({
		queryKey: queryKeys.threadFeedback(threadId),
		queryFn: () => fetchThreadFeedback(tokenFn, threadId),
		enabled: userLoaded && !frozenIsNewThread
	});

	return {
		messages: agentMessages,
		isEmpty,
		input,
		handleInputChange,
		handleSubmit,
		submitMessage,
		setInput,
		streaming: isStreaming,
		loading,
		threadId,
		feedbackMap,
		stop
	};
};

export default useChat;
