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
import { useMessageLimit } from "@/components/organisms/MessageLimit/useMessageLimit";

// `/settings` layout (was the async server component app/settings/layout.tsx).
// The old version read Clerk + Redis on the server; here the guard and the
// profile come from useUser, and usage is fetched from the worker /usage
// endpoint via useMessageLimit instead of reading Redis directly.
const SettingsLayout = () => {
	const { user, isLoaded, isSignedIn } = useUser();
	const { messageLimit } = useMessageLimit();

	if (isLoaded && !isSignedIn) {
		return <Navigate to="/" />;
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
	component: SettingsLayout
});
