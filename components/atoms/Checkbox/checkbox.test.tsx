import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Checkbox from "./index"; // Adjust the import according to your file structure

describe("Checkbox component", () => {
	it("renders without crashing", () => {
		render(<Checkbox />);
		const checkboxElement = screen.getByRole("checkbox");
		expect(checkboxElement).toBeInTheDocument();
	});

	it("can be checked and unchecked", () => {
		render(<Checkbox />);
		const checkboxElement = screen.getByRole("checkbox");

		// Initially unchecked
		expect(checkboxElement).not.toBeChecked();

		// Check the checkbox
		fireEvent.click(checkboxElement);
		expect(checkboxElement).toBeChecked();

		// Uncheck the checkbox
		fireEvent.click(checkboxElement);
		expect(checkboxElement).not.toBeChecked();
	});

	it("forwards refs correctly", () => {
		const ref = React.createRef<HTMLButtonElement>();
		render(<Checkbox ref={ref} />);
		expect(ref.current).toBeInstanceOf(HTMLButtonElement);
	});

	it("is disabled when the disabled prop is set", () => {
		render(<Checkbox disabled />);
		const checkboxElement = screen.getByRole("checkbox");
		expect(checkboxElement).toBeDisabled();
	});

	it("calls onChange handler when clicked", () => {
		const handleChange = jest.fn();
		render(<Checkbox onCheckedChange={handleChange} />);
		const checkboxElement = screen.getByRole("checkbox");

		fireEvent.click(checkboxElement);
		expect(handleChange).toHaveBeenCalledTimes(1);

		fireEvent.click(checkboxElement);
		expect(handleChange).toHaveBeenCalledTimes(2);
	});
});
