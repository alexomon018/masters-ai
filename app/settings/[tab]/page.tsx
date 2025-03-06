import { SettingsNavigation } from "@molecules";
import { HistoryAndSync, AccountUpgrade, Customization } from "@organisms";
import QueryClientProvider from "@/providers/queryClientProvider";

type Params = Promise<{ tab: string }>;

interface PageProps {
	params: Params;
}

const SettingsPage = async ({ params }: PageProps) => {
	const { tab } = await params;

	const renderTabContent = () => {
		switch (tab) {
			case "history":
				return <HistoryAndSync />;
			case "account":
				return <AccountUpgrade />;
			case "customization":
				return <Customization />;
			case "models":
				return (
					<div className="text-center text-muted-foreground">Coming Soon</div>
				);
			case "attachments":
				return (
					<div className="text-center text-muted-foreground">Coming Soon</div>
				);
			default:
				return <AccountUpgrade />;
		}
	};

	return (
		<QueryClientProvider>
			<SettingsNavigation className="hidden lg:flex" />
			{renderTabContent()}
		</QueryClientProvider>
	);
};

export default SettingsPage;
