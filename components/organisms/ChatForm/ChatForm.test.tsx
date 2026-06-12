import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import {
	renderWithProviders,
	screen
} from "../../../test/utils/renderWithProviders";
import ChatForm from "./ChatForm";

vi.mock("@clerk/clerk-react", () => ({
	useAuth: () => ({ getToken: vi.fn(async () => null), isSignedIn: false }),
	useUser: () => ({ user: null, isSignedIn: false, isLoaded: true })
}));

const baseProps = () => ({
	formRef: createRef<HTMLFormElement>(),
	onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
	input: "",
	handleInputChange: vi.fn(),
	streaming: false
});

describe("ChatForm", () => {
	it("renders the textarea with the placeholder", () => {
		renderWithProviders(<ChatForm {...baseProps()} />);
		expect(screen.getByPlaceholderText("Your question...")).toBeInTheDocument();
	});

	it("calls handleInputChange as the user types", async () => {
		const user = userEvent.setup();
		const props = baseProps();
		renderWithProviders(<ChatForm {...props} />);
		await user.type(screen.getByPlaceholderText("Your question..."), "hi");
		expect(props.handleInputChange).toHaveBeenCalled();
	});

	it("submits the form on Enter (without Shift)", async () => {
		const user = userEvent.setup();
		const props = { ...baseProps(), input: "a question" };
		renderWithProviders(<ChatForm {...props} />);
		const textarea = screen.getByPlaceholderText("Your question...");
		textarea.focus();
		await user.keyboard("{Enter}");
		expect(props.onSubmit).toHaveBeenCalled();
	});

	it("does not submit on Shift+Enter (newline)", async () => {
		const user = userEvent.setup();
		const props = { ...baseProps(), input: "a question" };
		renderWithProviders(<ChatForm {...props} />);
		const textarea = screen.getByPlaceholderText("Your question...");
		textarea.focus();
		await user.keyboard("{Shift>}{Enter}{/Shift}");
		expect(props.onSubmit).not.toHaveBeenCalled();
	});

	it("disables the textarea and submit button while streaming", () => {
		renderWithProviders(<ChatForm {...baseProps()} streaming />);
		expect(screen.getByPlaceholderText("Your question...")).toBeDisabled();
		expect(screen.getByRole("button", { name: "" })).toBeDisabled();
	});

	it("shows the initial questions only when enabled", () => {
		const onClickQuestion = vi.fn();
		const { rerender } = renderWithProviders(
			<ChatForm {...baseProps()} />
		);
		rerender(
			<ChatForm
				{...baseProps()}
				showInitialQuestions
				onClickQuestion={onClickQuestion}
			/>
		);
		expect(screen.getAllByRole("button").length).toBeGreaterThan(1);
	});
});
