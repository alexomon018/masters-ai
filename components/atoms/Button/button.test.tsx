import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Button from "./index"; // Adjust the import according to your file structure

describe("Button component", () => {
	it("renders without crashing", () => {
		render(<Button>Click me</Button>);
		const buttonElement = screen.getByRole("button", { name: /click me/i });
		expect(buttonElement).toBeInTheDocument();
	});

	it("renders with the correct text", () => {
		render(<Button>Click me</Button>);
		const buttonElement = screen.getByRole("button", { name: /click me/i });
		expect(buttonElement).toHaveTextContent("Click me");
	});

	it("renders with the correct variant", () => {
		render(<Button variant="destructive">Delete</Button>);
		const buttonElement = screen.getByRole("button", { name: /delete/i });
		expect(buttonElement).toBeInTheDocument();
	});

	it("renders with the correct size", () => {
		render(<Button size="lg">Large Button</Button>);
		const buttonElement = screen.getByRole("button", { name: /large button/i });
		expect(buttonElement).toBeInTheDocument();
	});

	it("renders with the correct variant and size", () => {
		render(
			<Button variant="outline" size="sm">
				Small Outline
			</Button>
		);
		const buttonElement = screen.getByRole("button", {
			name: /small outline/i
		});
		expect(buttonElement).toBeInTheDocument();
	});

	it("is disabled when the disabled prop is set", () => {
		render(<Button disabled>Disabled</Button>);
		const buttonElement = screen.getByRole("button", { name: /disabled/i });
		expect(buttonElement).toBeDisabled();
	});

	it("calls onClick handler when clicked", () => {
		const handleClick = jest.fn();
		render(<Button onClick={handleClick}>Click me</Button>);
		const buttonElement = screen.getByRole("button", { name: /click me/i });

		fireEvent.click(buttonElement);
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it("renders as a link when the variant is link", () => {
		render(<Button variant="link">Link Button</Button>);
		const buttonElement = screen.getByRole("button", { name: /link button/i });
		expect(buttonElement).toBeInTheDocument();
	});
});
