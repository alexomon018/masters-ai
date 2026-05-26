import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { modelCards } from "@constants";
import {
	renderWithProviders,
	screen,
	within
} from "../../../test/utils/renderWithProviders";
import ChatModelSelector from "./ChatModelSelector";

const HAIKU = modelCards[0];
const SONNET = modelCards[1];

describe("ChatModelSelector", () => {
	it("shows the selected model name on the trigger", () => {
		renderWithProviders(<ChatModelSelector />);
		// Default selection is the first card.
		expect(
			screen.getByRole("button", { name: new RegExp(HAIKU.name, "i") })
		).toBeInTheDocument();
	});

	it("opens the dropdown and lists the enabled models", async () => {
		const user = userEvent.setup();
		renderWithProviders(<ChatModelSelector />);

		await user.click(
			screen.getByRole("button", { name: new RegExp(HAIKU.name, "i") })
		);

		const menu = await screen.findByRole("menu");
		// All cards are enabled by default → each appears in the menu.
		modelCards.forEach((model) => {
			expect(
				within(menu).getByText(model.name)
			).toBeInTheDocument();
		});
	});

	it("selecting a model updates the trigger label", async () => {
		const user = userEvent.setup();
		renderWithProviders(<ChatModelSelector />);

		await user.click(
			screen.getByRole("button", { name: new RegExp(HAIKU.name, "i") })
		);
		const menu = await screen.findByRole("menu");
		await user.click(within(menu).getByText(SONNET.name));

		// Trigger now reflects the new selection; the menu has closed.
		expect(
			screen.getByRole("button", { name: new RegExp(SONNET.name, "i") })
		).toBeInTheDocument();
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});
});
