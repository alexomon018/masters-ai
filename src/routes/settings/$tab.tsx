import { createFileRoute, useParams } from "@tanstack/react-router";
import { SettingsNavigation } from "@molecules";
import { Paperclip } from "lucide-react";
import {
	AccountUpgrade,
	ApiKeysManager,
	Customization,
	ModelsPicker
} from "@organisms";

const ComingSoon = () => (
	<div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-10 text-center">
		<Paperclip className="size-6 text-muted-foreground" />
		<p className="text-base font-medium">Attachments are coming soon</p>
		<p className="text-sm text-muted-foreground">
			You&apos;ll be able to manage uploaded files here.
		</p>
	</div>
);

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
			return <ComingSoon />;
		default:
			return <AccountUpgrade />;
	}
};

const SettingsTabPage = () => {
	const { tab } = useParams({ from: "/settings/$tab" });

	return (
		<>
			<SettingsNavigation className="flex lg:hidden" />
			{renderTabContent(tab)}
		</>
	);
};

export const Route = createFileRoute("/settings/$tab")({
	component: SettingsTabPage
});
