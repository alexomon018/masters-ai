import { Separator } from "@atoms";
import {
	SettingsHeader,
	SettingsNavigation,
	CloudSyncSection,
	MessageHistorySection,
	DangerZoneSection,
	UserProfile,
	MessageUsage,
	KeyboardShortcuts
} from "@/components/molecules";
import { auth, currentUser } from "@clerk/nextjs/server";

export default async function SettingsPage() {
	const { userId } = await auth();

	// Protect the route by checking if the user is signed in
	if (!userId) {
		return <div>Sign in to view this page</div>;
	}

	const user = await currentUser();

	return (
		<div className="min-h-screen bg-background">
			<SettingsHeader />

			{/* Main Content */}
			<div className="container mx-auto px-4 py-8 sm:px-6 sm:py-10 md:py-12">
				<div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:gap-16">
					{/* Sidebar - Mobile: Top, Desktop: Left */}
					<aside className="flex w-full flex-col space-y-8 lg:w-[340px]">
						<UserProfile
							name={user?.fullName || ""}
							email={user?.emailAddresses[0].emailAddress || ""}
							plan="Free Plan"
							avatarUrl={user?.imageUrl || ""}
						/>
						<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
							<MessageUsage
								used={0}
								total={20}
								resetsAt="tomorrow at 1:00 AM"
							/>
							<KeyboardShortcuts />
						</div>
					</aside>

					{/* Main Settings */}
					<main className="flex-1 lg:max-w-[700px]">
						<SettingsNavigation activeTab="History & Sync" />

						{/* Settings Sections */}
						<div className="mt-8 space-y-8">
							<CloudSyncSection />
							<Separator className="my-8" />
							<MessageHistorySection />
							<Separator className="my-8" />
							<DangerZoneSection />

							<p className="mt-10 text-xs text-muted-foreground sm:text-sm">
								*The retention policies of our LLM hosting partners may vary.
							</p>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}
