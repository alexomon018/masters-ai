import { describe, expect, it } from "vitest";
import { ChatError, classifyChatError, encodeChatError } from "./chat-errors";

describe("encodeChatError", () => {
	it("joins code and message with a colon", () => {
		expect(encodeChatError("QUOTA_EXCEEDED", "limit hit")).toBe(
			"QUOTA_EXCEEDED:limit hit"
		);
	});
});

describe("classifyChatError", () => {
	it("passes ChatError through unchanged", () => {
		const err = new ChatError("QUOTA_EXCEEDED", "limit hit");
		expect(classifyChatError(err)).toEqual({
			code: "QUOTA_EXCEEDED",
			message: "limit hit"
		});
	});

	it.each([401, 402, 429])(
		"maps provider status %i to PROVIDER_UNAVAILABLE",
		(statusCode) => {
			expect(classifyChatError({ statusCode }).code).toBe(
				"PROVIDER_UNAVAILABLE"
			);
		}
	);

	it("maps insufficient-credit responses to PROVIDER_UNAVAILABLE", () => {
		const err = {
			statusCode: 400,
			responseBody: "Your credit balance is too low to access the API"
		};
		expect(classifyChatError(err).code).toBe("PROVIDER_UNAVAILABLE");
	});

	it("never leaks provider detail in the message", () => {
		const err = { statusCode: 429, responseBody: "rate_limit on org abc123" };
		const { message } = classifyChatError(err);
		expect(message).not.toContain("abc123");
		expect(message).toContain("temporarily unavailable");
	});

	it("falls back to UNKNOWN for unrecognized errors", () => {
		expect(classifyChatError(new Error("boom")).code).toBe("UNKNOWN");
		expect(classifyChatError("nope").code).toBe("UNKNOWN");
	});
});
