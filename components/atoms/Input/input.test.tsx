import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Input from "./index";

describe("Input component", () => {
	it("renders without crashing", () => {
		render(<Input />);
		const inputElement = screen.getByRole("textbox");
		expect(inputElement).toBeInTheDocument();
	});

	it("accepts and displays a placeholder", () => {
		const placeholderText = "Enter text here";
		render(<Input placeholder={placeholderText} />);
		const inputElement = screen.getByPlaceholderText(placeholderText);
		expect(inputElement).toBeInTheDocument();
	});

	it("applies custom class names", () => {
		const customClass = "custom-class";
		render(<Input className={customClass} />);
		const inputElement = screen.getByRole("textbox");
		expect(inputElement).toHaveClass(customClass);
	});

	it("forwards refs correctly", () => {
		const ref = React.createRef<HTMLInputElement>();
		render(<Input ref={ref} />);
		expect(ref.current).toBeInstanceOf(HTMLInputElement);
	});

	it("accepts and applies additional props", () => {
		render(<Input data-testid="custom-input" />);
		const inputElement = screen.getByTestId("custom-input");
		expect(inputElement).toBeInTheDocument();
	});

	it("renders with the correct type", () => {
		render(<Input type="password" data-testid="custom-input" />);
		const inputElement = screen.getByTestId("custom-input");
		expect(inputElement).toHaveAttribute("type", "password");
	});

	it("is disabled when the disabled prop is set", () => {
		render(<Input disabled />);
		const inputElement = screen.getByRole("textbox");
		expect(inputElement).toBeDisabled();
	});
});
