import type { Meta, StoryObj } from "@storybook/react";
import Input from "./index";

const meta: Meta<typeof Input> = {
	title: "Atoms/Input",
	component: Input,
	tags: ["autodocs"],
	parameters: {
		layout: "centered"
	}
};

export default meta;

export const input: StoryObj<typeof Input> = {};
