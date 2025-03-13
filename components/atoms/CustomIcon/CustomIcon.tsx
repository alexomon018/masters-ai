"use client";

import React, { FC } from "react";
import Icons from "@/assets/icons";
import { cn } from "@/utils";
import { useTheme } from "next-themes";
import Button from "../Button/index";

interface CustomIconProps {
	icon?: keyof typeof Icons;
	className?: string;
	onClick?: () => void;
}

const CustomIcon: FC<CustomIconProps> = ({ icon, className, onClick }) => {
	const { theme } = useTheme();

	if (!icon) {
		return null;
	}

	const Icon = Icons?.[icon];

	const label = `${icon} icon`;

	if (!Icon) {
		return null;
	}

	if (!onClick) {
		return (
			<div className={cn("cursor-default", className)}>
				<Icon
					aria-label={label}
					fill={theme === "dark" ? "#fff" : "#333"}
					width="100%"
					height="100%"
					data-testid="icon"
				/>
			</div>
		);
	}

	return (
		<Button
			className={cn("cursor-pointer", className)}
			onClick={onClick}
			aria-label={label}
		>
			<Icon
				fill={theme === "dark" ? "#fff" : "#333"}
				width="100%"
				height="100%"
				data-testid="icon"
			/>
		</Button>
	);
};

export default CustomIcon;
