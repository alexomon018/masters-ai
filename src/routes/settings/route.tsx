import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import { SettingsHeader, SettingsNavRail } from "@molecules";
import {
	authReadyForPrefetch,
	getClerkToken
} from "@/components/organisms/Chat/helpers/agentAuth";
import { messageLimitQueryOptions } from "@/components/organisms/MessageLimit/messageLimitQuery";

// `/settings` layout. Auth guard from useUser. The nav rail (lg+) sits beside a
// single content pane that matches the chat column width; profile + usage now
// live inside the Account tab, so the layout stays dumb.
const SettingsLayout = () => {
	const { isLoaded, isSignedIn } = useUser();

	// Wait for Clerk so we don't flash the shell with empty data before redirect.
	if (!isLoaded) {
		return null;
	}

	if (!isSignedIn) {
		return <Navigate to="/" replace />;
	}

	return (
		<div className="min-h-screen bg-background">
			<SettingsHeader />
			<div className="mx-auto max-w-screen-lg px-4 py-8">
				<div className="flex gap-10">
					<SettingsNavRail className="hidden lg:flex" />
					<main className="mx-auto w-full max-w-screen-md">
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
