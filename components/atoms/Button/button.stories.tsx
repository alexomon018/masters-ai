import type { Meta, StoryObj } from "@storybook/react";
import { ReloadIcon } from "@radix-ui/react-icons";
import Button from "./index";

const meta: Meta<typeof Button> = {
	title: "Atoms/Button",
	component: Button,
	tags: ["autodocs"],
	parameters: {
		layout: "centered"
	}
};

export default meta;

const buttonText = "Button";

export const Primary: StoryObj<typeof Button> = {
	args: {
		variant: "default",
		children: buttonText,
		className: "text-green bg-black"
	}
};

export const Secondary: StoryObj<typeof Button> = {
	args: {
		variant: "secondary",
		children: buttonText
	}
};

export const Destructive: StoryObj<typeof Button> = {
	args: {
		variant: "destructive",
		children: buttonText
	}
};

export const Outline: StoryObj<typeof Button> = {
	args: {
		variant: "outline",
		children: buttonText
	}
};

export const Ghost: StoryObj<typeof Button> = {
	args: {
		variant: "ghost",
		children: buttonText
	}
};

export const Link: StoryObj<typeof Button> = {
	args: {
		variant: "link",
		children: buttonText
	}
};

export const WithIcon: StoryObj<typeof Button> = {
	args: {
		variant: "default",
		size: "lg",
		children: (
			<>
				<ReloadIcon /> {buttonText}
			</>
		)
	}
};

export const Loading: StoryObj<typeof Button> = {
	args: {
		variant: "default",
		size: "lg",
		children: (
			<>
				<ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
				Please wait
			</>
		)
	}
};
