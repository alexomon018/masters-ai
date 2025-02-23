import { Button } from "@atoms";

interface SettingsNavigationProps {
	activeTab: string;
}

export default function SettingsNavigation({
	activeTab
}: SettingsNavigationProps) {
	const tabs = [
		"Account",
		"Customization",
		"History & Sync",
		"Models",
		"Attachments",
		"Contact Us"
	];

	return (
		<nav className="mb-6 flex gap-1 overflow-x-auto pb-2 sm:mb-8 sm:gap-4 sm:pb-0">
			{tabs.map((tab) => (
				<Button
					key={tab}
					variant={activeTab === tab ? "secondary" : "ghost"}
					className="shrink-0 text-sm sm:text-base"
				>
					{tab}
				</Button>
			))}
		</nav>
	);
}
