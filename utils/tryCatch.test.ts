import { describe, expect, it } from "vitest";
import { tryCatch } from "./tryCatch";

describe("tryCatch", () => {
	it("returns success with the resolved data", async () => {
		const result = await tryCatch(Promise.resolve(42));
		expect(result).toEqual({ data: 42, error: undefined, success: true });
	});

	it("returns failure with the rejection error", async () => {
		const err = new Error("boom");
		const result = await tryCatch(Promise.reject(err));
		expect(result.success).toBe(false);
		expect(result.error).toBe(err);
		expect(result.data).toBeUndefined();
	});

	it("preserves a custom error type", async () => {
		class CustomError extends Error {
			code = "X_CUSTOM";
		}
		const result = await tryCatch<never, CustomError>(
			Promise.reject(new CustomError("nope"))
		);
		expect(result.success).toBe(false);
		expect(result.error).toBeInstanceOf(CustomError);
		expect((result.error as CustomError).code).toBe("X_CUSTOM");
	});

	it("narrows the discriminated union on the success flag", async () => {
		const result = await tryCatch(Promise.resolve("hello"));
		if (result.success) {
			// Type-narrowed: data is string, error is never.
			expect(result.data.toUpperCase()).toBe("HELLO");
		} else {
			throw new Error("expected success");
		}
	});
});
