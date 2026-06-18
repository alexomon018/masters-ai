// AES-256-GCM encryption for BYOK provider keys, stored at rest in D1. The
// master secret (env.KEY_ENCRYPTION_SECRET) is hashed to the AES key; each
// encryption uses a fresh random 96-bit IV. Plaintext keys are never persisted.

export interface SealedKey {
	ciphertext: string;
	iv: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
	const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	let binary = "";
	for (const byte of arr) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
	if (!secret) throw new Error("KEY_ENCRYPTION_SECRET is not configured");
	const hash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
	return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
		"encrypt",
		"decrypt"
	]);
}

export async function encryptKey(
	plaintext: string,
	secret: string
): Promise<SealedKey> {
	const key = await deriveAesKey(secret);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const sealed = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		encoder.encode(plaintext)
	);
	return { ciphertext: toBase64(sealed), iv: toBase64(iv) };
}

export async function decryptKey(
	sealed: SealedKey,
	secret: string
): Promise<string> {
	const key = await deriveAesKey(secret);
	const plaintext = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: fromBase64(sealed.iv) },
		key,
		fromBase64(sealed.ciphertext)
	);
	return decoder.decode(plaintext);
}

export function lastFour(value: string): string {
	return value.slice(-4);
}
