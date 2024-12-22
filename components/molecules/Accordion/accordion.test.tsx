import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent
} from "./index"; // Adjust the import according to your file structure

describe("Accordion component", () => {
	it("renders without crashing", () => {
		render(
			<Accordion type="single" collapsible>
				<AccordionItem value="item-1">
					<AccordionTrigger>Is it accessible?</AccordionTrigger>
					<AccordionContent>
						Yes. It adheres to the WAI-ARIA design pattern.
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		);
		const triggerElement = screen.getByText("Is it accessible?");
		expect(triggerElement).toBeInTheDocument();
	});

	it("toggles content visibility when trigger is clicked", () => {
		render(
			<Accordion type="single" collapsible={true}>
				<AccordionItem value="item-1">
					<AccordionTrigger>Is it accessible?</AccordionTrigger>
					<AccordionContent>
						Yes. It adheres to the WAI-ARIA design pattern.
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		);
		const triggerElement = screen.getByText("Is it accessible?");

		// Initially, the content should not be in the document
		expect(
			screen.queryByText("Yes. It adheres to the WAI-ARIA design pattern.")
		).not.toBeInTheDocument();

		// Click the trigger to show the content
		fireEvent.click(triggerElement);
		expect(
			screen.getByText("Yes. It adheres to the WAI-ARIA design pattern.")
		).toBeVisible();

		// Click the trigger again to hide the content
		fireEvent.click(triggerElement);
		expect(
			screen.queryByText("Yes. It adheres to the WAI-ARIA design pattern.")
		).not.toBeInTheDocument();
	});

	it("collapses other items when a new item is expanded in single mode", () => {
		render(
			<Accordion type="single" collapsible>
				<AccordionItem value="item-1">
					<AccordionTrigger>Is it accessible?</AccordionTrigger>
					<AccordionContent>
						Yes. It adheres to the WAI-ARIA design pattern.
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="item-2">
					<AccordionTrigger>Is it customizable?</AccordionTrigger>
					<AccordionContent>
						Yes. You can customize it as you like.
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		);
		const triggerElement1 = screen.getByText("Is it accessible?");
		const triggerElement2 = screen.getByText("Is it customizable?");

		// Initially, both contents should not be in the document
		expect(
			screen.queryByText("Yes. It adheres to the WAI-ARIA design pattern.")
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Yes. You can customize it as you like.")
		).not.toBeInTheDocument();

		// Click the first trigger to show the first content
		fireEvent.click(triggerElement1);
		expect(
			screen.getByText("Yes. It adheres to the WAI-ARIA design pattern.")
		).toBeVisible();
		expect(
			screen.queryByText("Yes. You can customize it as you like.")
		).not.toBeInTheDocument();

		// Click the second trigger to show the second content and hide the first content
		fireEvent.click(triggerElement2);
		expect(
			screen.queryByText("Yes. It adheres to the WAI-ARIA design pattern.")
		).not.toBeInTheDocument();
		expect(
			screen.getByText("Yes. You can customize it as you like.")
		).toBeVisible();
	});

	it("allows multiple items to be expanded in multiple mode", () => {
		render(
			<Accordion type="multiple">
				<AccordionItem value="item-1">
					<AccordionTrigger>Is it accessible?</AccordionTrigger>
					<AccordionContent>
						Yes. It adheres to the WAI-ARIA design pattern.
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="item-2">
					<AccordionTrigger>Is it customizable?</AccordionTrigger>
					<AccordionContent>
						Yes. You can customize it as you like.
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		);
		const triggerElement1 = screen.getByText("Is it accessible?");
		const triggerElement2 = screen.getByText("Is it customizable?");

		// Initially, both contents should not be in the document
		expect(
			screen.queryByText("Yes. It adheres to the WAI-ARIA design pattern.")
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Yes. You can customize it as you like.")
		).not.toBeInTheDocument();

		// Click the first trigger to show the first content
		fireEvent.click(triggerElement1);
		expect(
			screen.getByText("Yes. It adheres to the WAI-ARIA design pattern.")
		).toBeVisible();
		expect(
			screen.queryByText("Yes. You can customize it as you like.")
		).not.toBeInTheDocument();

		// Click the second trigger to show the second content without hiding the first content
		fireEvent.click(triggerElement2);
		expect(
			screen.getByText("Yes. It adheres to the WAI-ARIA design pattern.")
		).toBeVisible();
		expect(
			screen.getByText("Yes. You can customize it as you like.")
		).toBeVisible();
	});
});
