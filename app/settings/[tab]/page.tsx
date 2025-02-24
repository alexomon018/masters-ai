import { SettingsNavigation } from "@molecules";
import { HistoryAndSync, AccountUpgrade, Customization } from "@organisms";

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
				return <div>User Preferences</div>;
			case "attachments":
				return <div>User Preferences</div>;
			default:
				return <AccountUpgrade />;
		}
	};

	return (
		<>
			<SettingsNavigation className="hidden lg:flex" />
			{renderTabContent()}
		</>
	);
};

export default SettingsPage;
