import { Button } from "@atoms";
import { cn } from "@utils";
import { Link, useLocation } from "@tanstack/react-router";
import { SETTINGS_TABS } from "@constants";

interface SettingsNavigationProps {
	className: string;
}

const SettingsNavigation = ({ className }: SettingsNavigationProps) => {
	const pathname = useLocation({ select: (location) => location.pathname });

	const activeTab = SETTINGS_TABS.find((tab) => tab.href === pathname)?.name;

	return (
		<nav
			className={cn(
				"scrollbar-hide mb-6 flex justify-center gap-1 overflow-x-auto bg-muted pb-2 sm:mb-8 sm:gap-4 sm:pb-0 md:rounded-md",
				className
			)}
		>
			{SETTINGS_TABS.map((tab) => (
				<Link
					to="/settings/$tab"
					params={{ tab: tab.tab }}
					key={tab.name}
					className="p-1"
				>
					<Button
						key={tab.name}
						variant={activeTab === tab.name ? "outline" : "ghost"}
						className="shrink-0 text-sm sm:text-base"
					>
						{tab.name}
					</Button>
				</Link>
			))}
		</nav>
	);
};

export default SettingsNavigation;
