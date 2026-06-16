import { describe, expect, it } from "vitest";
import { parseChatError } from "./chatError";

describe("parseChatError", () => {
	it("parses a known encoded error", () => {
		const result = parseChatError(
			new Error("QUOTA_EXCEEDED:You've reached today's limit.")
		);
		expect(result).toEqual({
			code: "QUOTA_EXCEEDED",
			message: "You've reached today's limit."
		});
	});

	it("keeps colons inside the message", () => {
		const result = parseChatError(
			new Error("PROVIDER_UNAVAILABLE:Down: try later")
		);
		expect(result.code).toBe("PROVIDER_UNAVAILABLE");
		expect(result.message).toBe("Down: try later");
	});

	it("falls back when the error is undefined", () => {
		expect(parseChatError(undefined).code).toBe("UNKNOWN");
	});

	it("falls back when the code is unknown", () => {
		expect(parseChatError(new Error("WEIRD:nope")).code).toBe("UNKNOWN");
	});

	it("falls back when there is no code separator", () => {
		expect(parseChatError(new Error("just a message")).code).toBe("UNKNOWN");
	});
});
