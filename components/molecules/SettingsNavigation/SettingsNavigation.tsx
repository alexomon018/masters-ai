import { Button } from "@atoms";
import { cn } from "@utils";
import Link from "next/link";

interface SettingsNavigationProps {
	activeTab: string;
	className: string;
}

const SettingsNavigation = ({
	activeTab,
	className
}: SettingsNavigationProps) => {
	const tabs = [
		"Account",
		"Customization",
		"History & Sync",
		"Models",
		"Attachments",
		"Contact Us"
	];

	return (
		<nav
			className={cn(
				"scrollbar-hide mb-6 flex gap-1 overflow-x-auto pb-2 sm:mb-8 sm:gap-4 sm:pb-0",
				className
			)}
		>
			{tabs.map((tab) => (
				<Link href={`/settings/${tab.toLowerCase()}`} key={tab}>
					<Button
						key={tab}
						variant={activeTab === tab ? "secondary" : "ghost"}
						className="shrink-0 text-sm sm:text-base"
					>
						{tab}
					</Button>
				</Link>
			))}
		</nav>
	);
};

export default SettingsNavigation;
