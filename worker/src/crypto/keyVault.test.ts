import { describe, expect, it } from "vitest";
import { decryptKey, encryptKey, lastFour } from "./keyVault";

const SECRET = "test-key-encryption-secret";

describe("keyVault", () => {
	it("round-trips a plaintext key", async () => {
		const plaintext = "sk-ant-abc123def456ghi789";
		const sealed = await encryptKey(plaintext, SECRET);
		const decrypted = await decryptKey(sealed, SECRET);
		expect(decrypted).toBe(plaintext);
	});

	it("never stores the plaintext in the ciphertext", async () => {
		const plaintext = "sk-ant-secretvalue000";
		const sealed = await encryptKey(plaintext, SECRET);
		expect(sealed.ciphertext).not.toContain(plaintext);
		expect(sealed.ciphertext).not.toBe(plaintext);
	});

	it("uses a fresh iv per encryption", async () => {
		const a = await encryptKey("sk-ant-same", SECRET);
		const b = await encryptKey("sk-ant-same", SECRET);
		expect(a.iv).not.toBe(b.iv);
		expect(a.ciphertext).not.toBe(b.ciphertext);
	});

	it("fails to decrypt with the wrong secret", async () => {
		const sealed = await encryptKey("sk-ant-xyz", SECRET);
		await expect(decryptKey(sealed, "other-secret")).rejects.toThrow();
	});

	it("fails to decrypt tampered ciphertext", async () => {
		const sealed = await encryptKey("sk-ant-xyz", SECRET);
		const tampered = { ...sealed, ciphertext: `${sealed.ciphertext.slice(0, -4)}AAAA` };
		await expect(decryptKey(tampered, SECRET)).rejects.toThrow();
	});

	it("throws when the secret is empty", async () => {
		await expect(encryptKey("sk-ant-xyz", "")).rejects.toThrow(
			"KEY_ENCRYPTION_SECRET"
		);
	});

	it("returns the last four chars", () => {
		expect(lastFour("sk-ant-abcd1234")).toBe("1234");
	});
});
