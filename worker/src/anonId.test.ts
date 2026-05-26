import { describe, expect, it } from "vitest";
// The worker copy only verifies; reuse the app signer to mint test values so
// this doubles as a cross-package wire-format regression guard.
import {
	generateRawAnonId,
	signAnonId
} from "../../utils/anonId";
import { verifyAnonId } from "./anonId";

const SECRET = "shared-hmac-secret";

describe("worker verifyAnonId", () => {
	it("verifies a value signed by the app-side signer (same secret)", async () => {
		const raw = generateRawAnonId();
		const signed = await signAnonId(raw, SECRET);
		await expect(verifyAnonId(signed, SECRET)).resolves.toBe(raw);
	});

	it("rejects a value signed with a different secret", async () => {
		const raw = generateRawAnonId();
		const signed = await signAnonId(raw, SECRET);
		await expect(verifyAnonId(signed, "other")).resolves.toBeNull();
	});

	it.each(["", "nodot", ".sig", "raw.", "bad id.sig"])(
		"returns null for malformed input %j",
		async (input) => {
			await expect(verifyAnonId(input, SECRET)).resolves.toBeNull();
		}
	);

	it("returns null on a signature length mismatch", async () => {
		const raw = generateRawAnonId();
		await expect(verifyAnonId(`${raw}.short`, SECRET)).resolves.toBeNull();
	});
});
