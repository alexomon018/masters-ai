import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import {
	KeyboardShortcuts,
	MessageUsage,
	SettingsHeader,
	SettingsNavigation,
	UserProfile
} from "@molecules";
import { messageAllowed } from "@constants";
import {
	authReadyForPrefetch,
	getClerkToken
} from "@/components/organisms/Chat/helpers/agentAuth";
import { messageLimitQueryOptions } from "@/components/organisms/MessageLimit/messageLimitQuery";
import { useMessageLimit } from "@/components/organisms/MessageLimit/useMessageLimit";

// `/settings` layout. Auth guard + profile come from useUser; usage comes from
// the worker /usage endpoint via useMessageLimit.
const SettingsLayout = () => {
	const { user, isLoaded, isSignedIn } = useUser();
	const { messageLimit } = useMessageLimit();

	// Wait for Clerk so we don't flash the shell with empty data before redirect.
	if (!isLoaded) {
		return null;
	}

	if (!isSignedIn) {
		return <Navigate to="/" replace />;
	}

	const usageData = {
		used: messageLimit?.used ?? 0,
		total: messageLimit?.total ?? messageAllowed.authenticated,
		resetsAt: messageLimit?.resetsAt ?? "in 1 day"
	};

	return (
		<div className="min-h-screen bg-background">
			<SettingsHeader />
			<SettingsNavigation className="flex lg:hidden" />
			<div className="container mx-auto max-w-8xl px-4 py-8">
				<div className="flex flex-col justify-center gap-10 lg:flex-row lg:gap-16">
					<aside className="flex w-full flex-col space-y-8 lg:w-[340px]">
						<UserProfile
							name={user?.fullName || ""}
							email={user?.emailAddresses[0]?.emailAddress || ""}
							plan="Free Plan"
							avatarUrl={user?.imageUrl || ""}
						/>
						<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
							<MessageUsage
								used={usageData.used}
								total={usageData.total}
								resetsAt={usageData.resetsAt}
							/>
							<KeyboardShortcuts />
						</div>
					</aside>

					<main className="flex-1 lg:max-w-[700px]">
						<Outlet />
					</main>
				</div>
			</div>
		</div>
	);
};

export const Route = createFileRoute("/settings")({
	// Warm the usage cache before the layout renders (and on hover). Skipped
	// until Clerk is ready — same reasoning as the _chat threads loader.
	loader: ({ context }) => {
		if (!authReadyForPrefetch()) return undefined;
		return context.queryClient.ensureQueryData(
			messageLimitQueryOptions(getClerkToken)
		);
	},
	component: SettingsLayout
});
