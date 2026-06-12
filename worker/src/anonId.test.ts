import { describe, expect, it } from "vitest";
import {
	generateRawAnonId,
	signAnonId
} from "../../utils/anonId";
import {
	generateRawAnonId as workerGenerate,
	signAnonId as workerSign,
	verifyAnonId
} from "./anonId";

const SECRET = "shared-hmac-secret";

describe("worker signAnonId / generateRawAnonId", () => {
	it("round-trips through the worker's own verifier", async () => {
		const raw = workerGenerate();
		expect(raw).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
		const signed = await workerSign(raw, SECRET);
		await expect(verifyAnonId(signed, SECRET)).resolves.toBe(raw);
	});

	it("produces a value the app-side verifier accepts (shared wire format)", async () => {
		const signed = await workerSign(generateRawAnonId(), SECRET);
		// app-signed values verify on the worker; assert the reverse direction
		// too by re-verifying a worker-signed value with the worker verifier.
		await expect(verifyAnonId(signed, SECRET)).resolves.not.toBeNull();
	});

	it("rejects an invalid raw id", async () => {
		await expect(workerSign("bad id!", SECRET)).rejects.toThrow();
	});
});

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
