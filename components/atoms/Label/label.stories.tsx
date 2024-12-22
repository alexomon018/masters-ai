import type { Meta, StoryObj } from "@storybook/react";
import Label from "./index";

const meta: Meta<typeof Label> = {
	title: "Atoms/Label",
	component: Label,
	tags: ["autodocs"],
	parameters: {
		layout: "centered"
	}
};

export default meta;

const buttonText = "Label";

export const label: StoryObj<typeof Label> = {
	args: {
		children: buttonText
	}
};
