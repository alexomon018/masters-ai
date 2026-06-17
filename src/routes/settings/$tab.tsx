import { createFileRoute, useParams } from "@tanstack/react-router";
import { SettingsNavigation } from "@molecules";
import { AccountUpgrade, Customization, ModelsPicker } from "@organisms";
import { usePostHog } from "@posthog/react";
import { useEffect } from "react";

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
	const posthog = usePostHog();

	// Sync settings tab navigation to PostHog (synchronizing with external analytics).
	useEffect(() => {
		posthog.capture("settings_tab_viewed", { tab });
	}, [tab, posthog]);

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
