import React, {
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from "react";
import Markdown from "markdown-to-jsx";
import type { UIMessage } from "ai";
import cn from "@/utils/cn";
import { User as UserIcon, ThumbsUp, ThumbsDown } from "lucide-react";
import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from "@/components/atoms/Avatar/Avatar";
import { useUser } from "@clerk/clerk-react";
import { useTokenFn } from "@hooks";
import {
	deleteFeedbackRemote,
	sendFeedbackRemote
} from "@/components/organisms/Chat/helpers";
import type { FeedbackEntry } from "@/components/organisms/Chat/helpers";
import CodeBlock from "../CodeBlock/CodeBlock";
import Tooltip from "../Tooltip/Tooltip";
import ToolStatus from "./ToolStatus";

const DOWNVOTE_REASONS = [
	"Not accurate",
	"Not helpful",
	"Out of date",
	"Off topic"
] as const;

interface BaseProps {
	children: React.ReactNode;
}

interface CodeComponentProps extends BaseProps {
	className?: string;
}

const InlineCode: React.FC<BaseProps> = ({ children }) => (
	<code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-sm dark:bg-gray-800">
		{children}
	</code>
);

const OrderedList: React.FC<BaseProps> = ({ children }) => (
	<ol className="list-decimal">{children}</ol>
);

const UnorderedList: React.FC<BaseProps> = ({ children }) => (
	<ol className="list-disc">{children}</ol>
);

const Paragraph: React.FC<BaseProps> = ({ children }) => (
	<div className="my-2">{children}</div>
);

const PreBlock: React.FC<BaseProps> = ({ children }) => (
	<div className="not-prose">{children}</div>
);

const CodeComponent: React.FC<CodeComponentProps> = ({
	children,
	className
}) => {
	if (!className) {
		return <InlineCode>{children}</InlineCode>;
	}
	return <CodeBlock className={className}>{children as string}</CodeBlock>;
};

interface MessageProps {
	message: UIMessage;
	threadId: string;
	initialFeedback?: FeedbackEntry;
}

const toolStateToStatus = (
	state: string | undefined
): "running" | "complete" | "error" => {
	if (state === "output-available") return "complete";
	if (state === "output-error") return "error";
	return "running";
};

const Message: React.FC<MessageProps> = ({
	message,
	threadId,
	initialFeedback
}) => {
	const isUser = message.role === "user";
	const isAssistant = message.role === "assistant";
	const { user } = useUser();
	const isAnonymous = !user;
	const getToken = useTokenFn();

	const [feedback, setFeedback] = useState<"up" | "down" | null>(
		initialFeedback?.sentiment ?? null
	);
	const [panelOpen, setPanelOpen] = useState(false);
	const [selectedReason, setSelectedReason] = useState<string | null>(
		initialFeedback?.reason ?? null
	);
	const [comment, setComment] = useState(initialFeedback?.comment ?? "");

	// useState only reads initialFeedback once, so on a thread switch the hydrated
	// vote (fetched async, or arriving after this row mounts / is reused by the
	// virtualizer for a new message id) would never show — letting the user vote
	// again. Re-sync the local state from the hydration source: always on a
	// message change, and on the first time real feedback arrives for the current
	// message. We do NOT re-apply on later refetches, so an in-flight optimistic
	// vote is never clobbered.
	const syncedMessageIdRef = useRef<string | null>(null);
	const appliedHydrationRef = useRef(false);
	useEffect(() => {
		const isNewMessage = syncedMessageIdRef.current !== message.id;
		if (isNewMessage) {
			syncedMessageIdRef.current = message.id;
			appliedHydrationRef.current = false;
		}
		if (!isNewMessage && (appliedHydrationRef.current || !initialFeedback)) {
			return;
		}
		if (initialFeedback) appliedHydrationRef.current = true;
		setFeedback(initialFeedback?.sentiment ?? null);
		setSelectedReason(initialFeedback?.reason ?? null);
		setComment(initialFeedback?.comment ?? "");
		setPanelOpen(false);
	}, [message.id, initialFeedback]);

	const canPersist = Boolean(threadId) && Boolean(message.id);

	const handleUp = useCallback(() => {
		if (!canPersist) return;
		const previous = feedback;
		setPanelOpen(false);
		if (feedback === "up") {
			setFeedback(null);
			deleteFeedbackRemote(getToken, {
				threadId,
				messageId: message.id
			}).then((ok) => {
				if (!ok) setFeedback(previous);
			});
			return;
		}
		setFeedback("up");
		sendFeedbackRemote(getToken, {
			threadId,
			messageId: message.id,
			sentiment: "up"
		}).then((ok) => {
			if (!ok) setFeedback(previous);
		});
	}, [canPersist, feedback, getToken, threadId, message.id]);

	const handleDown = useCallback(() => {
		if (!canPersist) return;
		const previous = feedback;
		if (feedback === "down") {
			setFeedback(null);
			setPanelOpen(false);
			deleteFeedbackRemote(getToken, {
				threadId,
				messageId: message.id
			}).then((ok) => {
				if (!ok) setFeedback(previous);
			});
			return;
		}
		// Persist the bare downvote immediately so it counts even if the user
		// never fills in the follow-up; the panel collects optional detail.
		setFeedback("down");
		setPanelOpen(true);
		sendFeedbackRemote(getToken, {
			threadId,
			messageId: message.id,
			sentiment: "down"
		}).then((ok) => {
			if (!ok) {
				setFeedback(previous);
				setPanelOpen(false);
			}
		});
	}, [canPersist, feedback, getToken, threadId, message.id]);

	const submitDownvoteDetail = useCallback(() => {
		if (!canPersist) return;
		setPanelOpen(false);
		sendFeedbackRemote(getToken, {
			threadId,
			messageId: message.id,
			sentiment: "down",
			reason: selectedReason,
			comment: comment.trim() || null
		});
	}, [canPersist, getToken, threadId, message.id, selectedReason, comment]);

	const markdownOptions = useMemo(
		() => ({
			overrides: {
				p: Paragraph,
				ol: OrderedList,
				ul: UnorderedList,
				code: CodeComponent,
				pre: PreBlock
			}
		}),
		[]
	);

	const parts = message.parts ?? [];
	const hasRenderableContent = parts.some(
		(p) =>
			(p.type === "text" &&
				typeof (p as { text?: string }).text === "string" &&
				(p as { text: string }).text.length > 0) ||
			(typeof p.type === "string" && p.type.startsWith("tool-"))
	);

	// Skip rendering an assistant bubble that has no parts yet — prevents the
	// "ghost" avatar row that appears between submit and the first stream chunk.
	if (isAssistant && !hasRenderableContent) return null;

	const renderedParts = parts.map((part, i) => {
		if (part.type === "text") {
			const text = (part as { text: string }).text ?? "";
			if (!text) return null;
			return (
				<Markdown
					key={`text-${i}`}
					className={cn(
						"w-fit max-w-[600px] space-y-4 py-1.5 md:py-1",
						isUser ? "font-semibold" : ""
					)}
					options={markdownOptions}
				>
					{text}
				</Markdown>
			);
		}

		if (typeof part.type === "string" && part.type.startsWith("tool-")) {
			const toolName = part.type.replace("tool-", "");
			const status = toolStateToStatus((part as { state?: string }).state);
			return <ToolStatus key={`tool-${i}`} name={toolName} status={status} />;
		}

		return null;
	});

	return (
		<article
			data-message-id={message.id}
			data-role={message.role}
			className={cn(
				"flex w-full items-start gap-3 rounded-2xl p-3 md:gap-4 md:p-5"
			)}
		>
			{isUser ? (
				<div>
					{isAnonymous ? (
						<UserIcon className="size-10" />
					) : (
						<Avatar>
							<AvatarImage src={user?.imageUrl} alt="User avatar" />
							<AvatarFallback>
								{user?.fullName?.charAt(0) || user?.username?.charAt(0)}
							</AvatarFallback>
						</Avatar>
					)}
				</div>
			) : (
				// Plain <img> (not Radix Avatar): AvatarImage gates rendering on a
				// JS load event, which flashes the fallback on every remount even
				// when the logo is cached — visible as a flicker on thread switch.
				<img
					src="https://frontendmasters.com/static-assets/core/m-transparent.webp"
					alt="@masters"
					width={50}
					height={50}
					className="size-10 shrink-0"
				/>
			)}
			<div className="flex flex-col">
				{renderedParts}
				{isAssistant && (
					<div className="mt-2 flex items-center gap-1">
						<Tooltip label="Good response">
							<button
								type="button"
								onClick={handleUp}
								className={cn(
									"rounded-lg p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700",
									feedback === "up"
										? "text-green-600 dark:text-green-400"
										: "text-gray-400 dark:text-gray-500"
								)}
								aria-label="Good response"
								aria-pressed={feedback === "up"}
							>
								<ThumbsUp className="size-4" />
							</button>
						</Tooltip>
						<Tooltip label="Bad response">
							<button
								type="button"
								onClick={handleDown}
								className={cn(
									"rounded-lg p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700",
									feedback === "down"
										? "text-red-500 dark:text-red-400"
										: "text-gray-400 dark:text-gray-500"
								)}
								aria-label="Bad response"
								aria-pressed={feedback === "down"}
							>
								<ThumbsDown className="size-4" />
							</button>
						</Tooltip>
					</div>
				)}
				{isAssistant && feedback === "down" && panelOpen && (
					<div className="mt-2 flex max-w-[600px] flex-col gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
						<span className="text-sm text-gray-600 dark:text-gray-300">
							What went wrong? (optional)
						</span>
						<div className="flex flex-wrap gap-1.5">
							{DOWNVOTE_REASONS.map((reason) => (
								<button
									key={reason}
									type="button"
									onClick={() =>
										setSelectedReason((prev) =>
											prev === reason ? null : reason
										)
									}
									className={cn(
										"rounded-full border px-2.5 py-1 text-xs transition-colors",
										selectedReason === reason
											? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
											: "border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
									)}
									aria-pressed={selectedReason === reason}
								>
									{reason}
								</button>
							))}
						</div>
						<textarea
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							placeholder="Tell us more…"
							rows={3}
							maxLength={2000}
							className="w-full resize-none rounded-lg border border-gray-300 bg-transparent p-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-600"
						/>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setPanelOpen(false)}
								className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={submitDownvoteDetail}
								className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
							>
								Send
							</button>
						</div>
					</div>
				)}
			</div>
		</article>
	);
};

export default memo(Message);
