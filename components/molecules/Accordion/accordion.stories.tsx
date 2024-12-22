import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from "./index";

type Story = StoryObj<typeof Accordion>;

const meta: Meta<typeof Accordion> = {
	title: "Molecules/Accordion",
	component: Accordion,
	tags: ["autodocs"],
	parameters: {
		layout: "centered"
	}
};

const items = [
	{
		value: "item-1",
		trigger: "Is it accessible?",
		content: "Yes. It adheres to the WAI-ARIA design pattern."
	},
	{
		value: "item-2",
		trigger: "Is it customizable?",
		content: "Yes. You can customize it as per your needs."
	},
	{
		value: "item-3",
		trigger: "Is it customizable?",
		content: "Yes. You can customize it as per your needs."
	}
];

export const accordion: Story = {
	render: (args) => (
		<Accordion type="single" collapsible>
			<AccordionItem value="item-1">
				<AccordionTrigger>Is it accessible?</AccordionTrigger>
				<AccordionContent>
					Yes. It adheres to the WAI-ARIA design pattern.
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	)
};

export const multipleAccordion: Story = {
	render: (args) => (
		<Accordion {...args}>
			{items.map((item) => (
				<AccordionItem key={item.value} value={item.value}>
					<AccordionTrigger>{item.trigger}</AccordionTrigger>
					<AccordionContent>{item.content}</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	)
};

export default meta;
