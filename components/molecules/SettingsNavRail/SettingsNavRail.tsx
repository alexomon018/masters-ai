import { cn } from "@utils";
import { Link, useLocation } from "@tanstack/react-router";
import { SETTINGS_TABS } from "@constants";

interface SettingsNavRailProps {
	className?: string;
}

const SettingsNavRail = ({ className }: SettingsNavRailProps) => {
	const pathname = useLocation({ select: (location) => location.pathname });

	return (
		<nav className={cn("w-56 shrink-0 flex-col gap-1", className)}>
			{SETTINGS_TABS.map((tab) => {
				const isActive = tab.href === pathname;

				return (
					<Link
						key={tab.name}
						to="/settings/$tab"
						params={{ tab: tab.tab }}
						className={cn(
							"rounded-lg px-3 py-2 text-sm transition-colors",
							isActive
								? "bg-accent font-medium text-accent-foreground"
								: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
						)}
					>
						{tab.name}
					</Link>
				);
			})}
		</nav>
	);
};

export default SettingsNavRail;
