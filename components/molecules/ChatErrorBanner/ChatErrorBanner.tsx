import { AlertTriangle, Clock, X } from "lucide-react";
import { SignInButton } from "@clerk/clerk-react";
import type { ParsedChatError } from "@/components/organisms/Chat/helpers";

interface ChatErrorBannerProps {
	error: ParsedChatError;
	isAnon: boolean;
	onDismiss: () => void;
}

const ICONS = {
	QUOTA_EXCEEDED: Clock,
	PROVIDER_UNAVAILABLE: AlertTriangle,
	UNKNOWN: AlertTriangle
} as const;

const ChatErrorBanner = ({
	error,
	isAnon,
	onDismiss
}: ChatErrorBannerProps) => {
	const Icon = ICONS[error.code];
	const showSignIn = error.code === "QUOTA_EXCEEDED" && isAnon;

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
							Sign in to send more messages
						</button>
					</SignInButton>
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
