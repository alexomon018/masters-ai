import { UpgradeSection, DangerZoneSection } from "@molecules";
import { Separator } from "@atoms";

const AccountUpgrade = () => (
	<div>
		<UpgradeSection />
		<Separator className="my-8" />
		<DangerZoneSection />
	</div>
);

export default AccountUpgrade;
