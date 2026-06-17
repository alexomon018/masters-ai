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
import { fetchUserKeys } from "@/components/organisms/ApiKeysManager/userKeysApi";
import {
	authSubject,
	fetchThreadFeedback,
	getAnonId,
	parseChatError,
	readStoredAnonId,
	resolveAgentAuth,
	threadMessagesQueryOptions
} from "./helpers";
import type { ParsedChatError } from "./helpers";

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
		stop,
		error
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

	// status flips to "error" and `error` is populated when the worker emits an
	// encoded ChatError (quota, provider down). Parsed here so <Chat> can show a
	// banner; cleared automatically because the next send resets status/error.
	const parsedError = useMemo(
		() => (status === "error" ? parseChatError(error) : null),
		[status, error]
	);

	// Track the error instance the user dismissed so the banner stays hidden for
	// it but reappears for a fresh error. A new send resets `error`, so a later
	// failure produces a different object and the banner shows again.
	const [dismissedError, setDismissedError] = useState<Error | null>(null);

	// Locally-raised error for sends we block before they reach the worker (a
	// BYOK model selected with no key on file). Distinct from `error` so the
	// existing dismiss-tracking for server errors stays untouched.
	const [localError, setLocalError] = useState<ParsedChatError | null>(null);

	const dismissError = useCallback(() => {
		setLocalError(null);
		setDismissedError(error ?? null);
	}, [error]);

	const serverError =
		dismissedError === error && dismissedError !== null ? null : parsedError;
	const chatError = localError ?? serverError;

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

	// Connected BYOK provider keys, only ever fetched for signed-in users (anon
	// visitors can't reach BYOK models). Lets us block a keyless BYOK send
	// before it mints a thread or hits the worker.
	const { data: userKeys = [] } = useQuery({
		queryKey: queryKeys.userKeys(),
		queryFn: () => fetchUserKeys(tokenFn),
		enabled: userLoaded && !isAnon
	});

	const hasKeyForSelected =
		!selectedModel.byok ||
		userKeys.some((k) => k.provider === selectedModel.provider);

	// Clear the keyless-BYOK banner once the blocker is resolved — the user
	// switched models or connected the needed key.
	useEffect(() => {
		if (hasKeyForSelected) setLocalError(null);
	}, [hasKeyForSelected]);

	const runSubmit = useCallback(
		(rawText: string) => {
			const text = rawText.trim();
			if (!text) return;

			// Block a BYOK model with no connected key here, before the first-send
			// branch creates a thread and navigates. The worker enforces the same
			// rule as the authoritative backstop, but stopping client-side avoids a
			// stranded empty "New Chat" in the sidebar and a wasted round-trip.
			if (!hasKeyForSelected) {
				setLocalError({
					code: "NO_API_KEY",
					message:
						"This model needs your own API key. Connect one in Settings to use it."
				});
				return;
			}

			setLocalError(null);
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
		[
			threadId,
			sendMessage,
			tokenFn,
			queryClient,
			navigate,
			hasKeyForSelected
		]
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

	// Scope the feedback cache to the current identity so a previous user's
	// cached feedback can't be reused after an auth change on the same client.
	const subject = authSubject(user?.id);

	// One fetch per thread builds a { messageId -> feedback } map used to hydrate
	// the thumbs state in each Message. A new thread has no persisted feedback.
	const { data: feedbackMap = {} } = useQuery({
		queryKey: queryKeys.threadFeedback(subject, threadId),
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
		chatError,
		isAnon,
		dismissError,
		stop
	};
};

export default useChat;
