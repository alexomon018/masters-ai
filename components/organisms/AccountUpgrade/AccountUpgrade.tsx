import { useUser } from "@clerk/clerk-react";
import {
	UpgradeSection,
	DangerZoneSection,
	UserProfile,
	MessageUsage,
	KeyboardShortcuts
} from "@molecules";
import { Separator } from "@atoms";
import { messageAllowed } from "@constants";
import { useMessageLimit } from "@/components/organisms/MessageLimit/useMessageLimit";

const AccountUpgrade = () => {
	const { user } = useUser();
	const { messageLimit } = useMessageLimit();

	const usage = {
		used: messageLimit?.used ?? 0,
		total: messageLimit?.total ?? messageAllowed.authenticated,
		resetsAt: messageLimit?.resetsAt ?? "in 1 day"
	};

	return (
		<div className="space-y-8">
			<h1 className="text-xl font-semibold tracking-tight">Account</h1>

			<div className="space-y-6">
				<UserProfile
					name={user?.fullName || ""}
					email={user?.emailAddresses[0]?.emailAddress || ""}
					avatarUrl={user?.imageUrl || ""}
				/>
				<MessageUsage
					used={usage.used}
					total={usage.total}
					resetsAt={usage.resetsAt}
				/>
			</div>

			<UpgradeSection />

			<KeyboardShortcuts />

			<Separator />

			<DangerZoneSection />
		</div>
	);
};

export default AccountUpgrade;
