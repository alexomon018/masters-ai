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
				"scrollbar-hide mb-6 flex justify-center gap-1 overflow-x-auto pb-2 sm:mb-8 sm:gap-4 sm:pb-0",
				className
			)}
		>
			{SETTINGS_TABS.map((tab) => (
				<Link href={tab.href} key={tab.name}>
					<Button
						key={tab.name}
						variant={activeTab === tab.name ? "secondary" : "ghost"}
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
