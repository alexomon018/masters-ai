import {
	KeyboardShortcuts,
	MessageUsage,
	SettingsHeader,
	SettingsNavigation,
	UserProfile
} from "@molecules";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import redis from "@/lib/redis";

const SettingsLayout = async ({ children }: { children: React.ReactNode }) => {
	const { userId } = await auth();

	if (!userId) {
		return redirect("/");
	}

	let usageData = {
		used: 0,
		total: 20,
		resetsAt: "in 1 day"
	};

	try {
		const messageKey = `message_count:user:${userId}`;
		const messageCount = Number((await redis.get(messageKey)) || 0);
		const ttl = await redis.ttl(messageKey);

		// Calculate reset date (if TTL exists)
		let resetsAt = "never";
		if (ttl > 0) {
			const resetDate = new Date();
			resetDate.setSeconds(resetDate.getSeconds() + ttl);
			resetsAt = resetDate.toLocaleDateString();
		}

		usageData = {
			used: messageCount,
			total: 20,
			resetsAt
		};

		console.log("usageData", usageData);
	} catch (error) {
		console.error("Error fetching usage data:", error);
		// Will use the fallback data defined above
	}

	const user = await currentUser();

	return (
		<div className="min-h-screen bg-background">
			<SettingsHeader />
			<SettingsNavigation className="flex lg:hidden" />
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
								used={usageData.used}
								total={usageData.total}
								resetsAt={usageData.resetsAt}
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
