const RAW_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const SIG_RE = /^[A-Za-z0-9_-]+$/;
const ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

function bytesToBase64Url(bytes: Uint8Array): string {
	let bin = "";
	for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
	const b64 = typeof btoa === "function" ? btoa(bin) : "";
	return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(secret: string, message: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"]
	);
	const sig = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(message)
	);
	return bytesToBase64Url(new Uint8Array(sig));
}

export function generateRawAnonId(): string {
	const rand = new Uint8Array(21);
	crypto.getRandomValues(rand);
	let out = "";
	for (let i = 0; i < rand.length; i += 1) {
		out += ALPHABET[rand[i] % ALPHABET.length];
	}
	return out;
}

export async function signAnonId(
	rawId: string,
	secret: string
): Promise<string> {
	if (!RAW_ID_RE.test(rawId)) {
		throw new Error("Invalid raw anon id");
	}
	const sig = await hmac(secret, rawId);
	return `${rawId}.${sig}`;
}

export async function verifyAnonId(
	signed: string,
	secret: string
): Promise<string | null> {
	const idx = signed.indexOf(".");
	if (idx <= 0 || idx === signed.length - 1) return null;
	const rawId = signed.slice(0, idx);
	const sig = signed.slice(idx + 1);
	if (!RAW_ID_RE.test(rawId) || !SIG_RE.test(sig)) return null;
	const expected = await hmac(secret, rawId);
	if (expected.length !== sig.length) return null;
	let diff = 0;
	for (let i = 0; i < expected.length; i += 1) {
		diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
	}
	return diff === 0 ? rawId : null;
}
