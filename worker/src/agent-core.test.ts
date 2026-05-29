import { describe, expect, it } from "vitest";
import type { ModelMessage } from "ai";
import { isCasualMessage } from "./agent-core";

const userMsg = (text: string): ModelMessage[] => [
	{ role: "user", content: text }
];

describe("isCasualMessage", () => {
	it.each([
		["ok", true],
		["hey there!", true],
		["thanks!", true],
		["hi", true],
		["who are you?", true],
		["thanks, that helps a lot", false],
		["ok different question - explain TypeScript generics", false],
		["How do React Server Components work?", false],
		["", false]
	])("classifies %j as casual=%s", (text, expected) => {
		expect(isCasualMessage(userMsg(text))).toBe(expected);
	});

	it("returns false when there is no message", () => {
		expect(isCasualMessage([])).toBe(false);
	});

	it("returns false when last message is not from the user", () => {
		expect(
			isCasualMessage([{ role: "assistant", content: "hi" }])
		).toBe(false);
	});

	it("handles array (multipart) user content", () => {
		const messages: ModelMessage[] = [
			{
				role: "user",
				content: [{ type: "text", text: "thanks!" }]
			}
		];
		expect(isCasualMessage(messages)).toBe(true);
	});

	it("does not classify multipart content with substantive text as casual", () => {
		const messages: ModelMessage[] = [
			{
				role: "user",
				content: [
					{
						type: "text",
						text: "ok different question - explain TypeScript generics"
					}
				]
			}
		];
		expect(isCasualMessage(messages)).toBe(false);
	});
});
