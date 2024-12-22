import type { Meta, StoryObj } from "@storybook/react";
import Checkbox from "./index";

const meta: Meta<typeof Checkbox> = {
	title: "Atoms/Checkbox",
	component: Checkbox,
	tags: ["autodocs"],
	parameters: {
		layout: "centered"
	}
};

export default meta;

const checkboxText = "Checkbox";

export const checkbox: StoryObj<typeof Checkbox> = {
	args: {
		children: checkboxText
	}
};
