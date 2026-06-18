import { AlertTriangle, Clock, KeyRound, X } from "lucide-react";
import { SignInButton } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import type { ParsedChatError } from "@/components/organisms/Chat/helpers";

interface ChatErrorBannerProps {
	error: ParsedChatError;
	isAnon: boolean;
	onDismiss: () => void;
}

const ICONS = {
	QUOTA_EXCEEDED: Clock,
	PROVIDER_UNAVAILABLE: AlertTriangle,
	NO_API_KEY: KeyRound,
	UNKNOWN: AlertTriangle
} as const;

const ChatErrorBanner = ({
	error,
	isAnon,
	onDismiss
}: ChatErrorBannerProps) => {
	const Icon = ICONS[error.code];
	// Anon users hit Settings as a dead end (it's signed-in only), so a keyless
	// BYOK send sends them to sign-in first; signed-in users go straight to the
	// API-keys tab.
	const showSignIn =
		(error.code === "QUOTA_EXCEEDED" || error.code === "NO_API_KEY") && isAnon;
	const showConnectKey = error.code === "NO_API_KEY" && !isAnon;
	const signInLabel =
		error.code === "NO_API_KEY"
			? "Sign in to connect a key"
			: "Sign in to send more messages";

	return (
		<div
			role="alert"
			className="mb-3 flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
		>
			<Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
			<div className="flex-1">
				<p>{error.message}</p>
				{showSignIn && (
					<SignInButton mode="modal">
						<button
							type="button"
							className="mt-1.5 font-medium underline underline-offset-2 hover:no-underline"
						>
							{signInLabel}
						</button>
					</SignInButton>
				)}
				{showConnectKey && (
					<Link
						to="/settings/$tab"
						params={{ tab: "api-keys" }}
						className="mt-1.5 inline-block font-medium underline underline-offset-2 hover:no-underline"
					>
						Connect a key in Settings
					</Link>
				)}
			</div>
			<button
				type="button"
				aria-label="Dismiss"
				onClick={onDismiss}
				className="shrink-0 rounded-md p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900"
			>
				<X className="size-4" aria-hidden />
			</button>
		</div>
	);
};

export default ChatErrorBanner;
