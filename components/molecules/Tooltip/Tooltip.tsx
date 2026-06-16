import * as React from "react";
import {
	Tooltip as TooltipRoot,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from "@/components/atoms/Tooltip/Tooltip";

interface TooltipProps {
	label: React.ReactNode;
	children: React.ReactElement;
	side?: "top" | "right" | "bottom" | "left";
	delayDuration?: number;
}

// Self-contained tooltip: bundles its own TooltipProvider so it can be dropped
// in anywhere without wiring a provider into the root tree. asChild keeps the
// trigger transparent — wrap an existing button and it stays the button.
const Tooltip: React.FC<TooltipProps> = ({
	label,
	children,
	side = "top",
	delayDuration = 200
}) => (
	<TooltipProvider delayDuration={delayDuration}>
		<TooltipRoot>
			<TooltipTrigger asChild>{children}</TooltipTrigger>
			<TooltipContent side={side}>{label}</TooltipContent>
		</TooltipRoot>
	</TooltipProvider>
);

export default Tooltip;
