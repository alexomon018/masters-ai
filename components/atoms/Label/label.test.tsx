import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Label from "./index"; // Adjust the import according to your file structure

describe("Label component", () => {
	it("renders without crashing", () => {
		render(<Label>Test Label</Label>);
		const labelElement = screen.getByText("Test Label");
		expect(labelElement).toBeInTheDocument();
	});

	it("forwards refs correctly", () => {
		const ref = React.createRef<HTMLLabelElement>();
		render(<Label ref={ref}>Test Label</Label>);
		expect(ref.current).toBeInstanceOf(HTMLLabelElement);
	});

	it("renders with the correct text", () => {
		render(<Label>Test Label</Label>);
		const labelElement = screen.getByText("Test Label");
		expect(labelElement).toHaveTextContent("Test Label");
	});

	it("accepts and applies additional props", () => {
		render(<Label data-testid="custom-label">Test Label</Label>);
		const labelElement = screen.getByTestId("custom-label");
		expect(labelElement).toBeInTheDocument();
	});

	it("renders with the correct HTML element", () => {
		render(<Label>Test Label</Label>);
		const labelElement = screen.getByText("Test Label");
		expect(labelElement.tagName).toBe("LABEL");
	});
});
