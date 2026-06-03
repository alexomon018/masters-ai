import { createFileRoute, useParams } from "@tanstack/react-router";
import { SettingsNavigation } from "@molecules";
import { AccountUpgrade, Customization, ModelsPicker } from "@organisms";

// `/settings/$tab` (was app/settings/[tab]/page.tsx). The QueryClientProvider
// it used to wrap is now provided once at the root route.
const renderTabContent = (tab: string) => {
	switch (tab) {
		case "account":
			return <AccountUpgrade />;
		case "customization":
			return <Customization />;
		case "models":
			return <ModelsPicker />;
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
