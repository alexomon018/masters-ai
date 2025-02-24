"use client";

import { Button } from "@atoms";
import { cn } from "@utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_TABS } from "@constants";

interface SettingsNavigationProps {
	className: string;
}

const SettingsNavigation = ({ className }: SettingsNavigationProps) => {
	const pathname = usePathname();

	const activeTab = SETTINGS_TABS.find((tab) => tab.href === pathname)?.name;

	return (
		<nav
			className={cn(
				"flex overflow-x-auto gap-1 pb-2 mb-6 scrollbar-hide sm:mb-8 sm:gap-4 sm:pb-0",
				className
			)}
		>
			{SETTINGS_TABS.map((tab) => (
				<Link href={tab.href} key={tab.name}>
					<Button
						key={tab.name}
						variant={activeTab === tab.name ? "secondary" : "ghost"}
						className="text-sm shrink-0 sm:text-base"
					>
						{tab.name}
					</Button>
				</Link>
			))}
		</nav>
	);
};

export default SettingsNavigation;
