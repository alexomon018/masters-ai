import { createFileRoute, useParams } from "@tanstack/react-router";

// `/settings/$tab` (was app/settings/[tab]/page.tsx). Scaffold placeholder;
// the component port restores the tab switch (account / customization /
// models / attachments) and the SettingsNavigation.
const SettingsTabPage = () => {
	const { tab } = useParams({ from: "/settings/$tab" });
	return (
		<div className="container mx-auto max-w-8xl px-4 py-8 text-muted-foreground">
			Settings tab (scaffold): {tab}
		</div>
	);
};

export const Route = createFileRoute("/settings/$tab")({
	component: SettingsTabPage
});
