import { SettingsNavigation } from "@molecules";
import { HistoryAndSync, AccountUpgrade, Customization } from "@organisms";

const SettingsPage = async ({ params }: { params: { tab: string } }) => {
	const { tab } = params;

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
