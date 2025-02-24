import {
	KeyboardShortcuts,
	MessageUsage,
	SettingsHeader,
	SettingsNavigation,
	UserProfile
} from "@molecules";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const SettingsLayout = async ({ children }: { children: React.ReactNode }) => {
	const { userId } = await auth();

	// Protect the route by checking if the user is signed in
	if (!userId) {
		return redirect("/");
	}

	const user = await currentUser();

	return (
		<div className="min-h-screen bg-background">
			<SettingsHeader />
			<SettingsNavigation className="flex lg:hidden" />
			<div className="container px-4 py-8 mx-auto sm:px-6 sm:py-10 md:py-12">
				<div className="flex flex-col gap-10 mx-auto max-w-7xl lg:flex-row lg:gap-16">
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
					<main className="flex-1 lg:max-w-[700px]">{children}</main>
				</div>
			</div>
		</div>
	);
};

export default SettingsLayout;
