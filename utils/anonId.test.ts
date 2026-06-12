import { describe, expect, it } from "vitest";
import { generateRawAnonId, signAnonId, verifyAnonId } from "./anonId";

const SECRET = "test-secret-value";

describe("generateRawAnonId", () => {
	it("returns a 21-char id from the URL-safe alphabet", () => {
		const id = generateRawAnonId();
		expect(id).toHaveLength(21);
		expect(id).toMatch(/^[A-Za-z0-9_-]{21}$/);
	});

	it("produces unique ids across many calls", () => {
		const ids = new Set(
			Array.from({ length: 500 }, () => generateRawAnonId())
		);
		expect(ids.size).toBe(500);
	});
});

describe("signAnonId / verifyAnonId round-trip", () => {
	it("verifies an id signed with the same secret", async () => {
		const raw = generateRawAnonId();
		const signed = await signAnonId(raw, SECRET);
		expect(signed.startsWith(`${raw}.`)).toBe(true);
		await expect(verifyAnonId(signed, SECRET)).resolves.toBe(raw);
	});

	it("rejects a value signed with a different secret", async () => {
		const raw = generateRawAnonId();
		const signed = await signAnonId(raw, SECRET);
		await expect(verifyAnonId(signed, "other-secret")).resolves.toBeNull();
	});

	it("rejects a tampered raw id", async () => {
		const raw = generateRawAnonId();
		const signed = await signAnonId(raw, SECRET);
		const [, sig] = signed.split(".");
		const tampered = `${generateRawAnonId()}.${sig}`;
		await expect(verifyAnonId(tampered, SECRET)).resolves.toBeNull();
	});

	it("rejects a tampered signature", async () => {
		const raw = generateRawAnonId();
		const signed = await signAnonId(raw, SECRET);
		const tampered = `${signed}x`;
		await expect(verifyAnonId(tampered, SECRET)).resolves.toBeNull();
	});
});

describe("signAnonId validation", () => {
	it("throws on a raw id that fails the format regex", async () => {
		await expect(signAnonId("short", SECRET)).rejects.toThrow(
			"Invalid raw anon id"
		);
		await expect(signAnonId("has spaces!!", SECRET)).rejects.toThrow();
	});
});

describe("verifyAnonId malformed input", () => {
	it.each([
		["", "empty string"],
		[".sig", "no raw id before the dot"],
		["rawonly.", "no signature after the dot"],
		["nodotatall", "missing separator"],
		["bad id.sig", "raw id fails the regex"]
	])("returns null for %s (%s)", async (input) => {
		await expect(verifyAnonId(input, SECRET)).resolves.toBeNull();
	});

	it("returns null on a signature length mismatch without throwing", async () => {
		const raw = generateRawAnonId();
		await expect(verifyAnonId(`${raw}.abc`, SECRET)).resolves.toBeNull();
	});
});
