import { createFileRoute, useParams } from "@tanstack/react-router";
import { SettingsNavigation } from "@molecules";
import {
	AccountUpgrade,
	ApiKeysManager,
	Customization,
	ModelsPicker
} from "@organisms";

const renderTabContent = (tab: string) => {
	switch (tab) {
		case "account":
			return <AccountUpgrade />;
		case "customization":
			return <Customization />;
		case "models":
			return <ModelsPicker />;
		case "api-keys":
			return <ApiKeysManager />;
		case "attachments":
			return (
				<div className="text-center text-muted-foreground">Coming Soon</div>
			);
		default:
			return <AccountUpgrade />;
	}
};

const SettingsTabPage = () => {
	const { tab } = useParams({ from: "/settings/$tab" });

	return (
		<>
			<SettingsNavigation className="hidden lg:flex" />
			{renderTabContent(tab)}
		</>
	);
};

export const Route = createFileRoute("/settings/$tab")({
	component: SettingsTabPage
});
