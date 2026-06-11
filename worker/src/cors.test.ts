import { describe, expect, it } from "vitest";
import { originMatches, resolveAllowedOrigin } from "./cors";

describe("originMatches", () => {
	it("matches an exact origin", () => {
		expect(
			originMatches("https://masters-ai.vercel.app", "https://masters-ai.vercel.app")
		).toBe(true);
	});

	it("matches a single-label wildcard against a preview URL", () => {
		expect(
			originMatches(
				"https://*.vercel.app",
				"https://masters-ad1sirxer-acme.vercel.app"
			)
		).toBe(true);
	});

	it("does not let the wildcard cross a dot boundary", () => {
		expect(
			originMatches("https://*.vercel.app", "https://a.b.vercel.app")
		).toBe(false);
	});

	it("rejects a non-matching host", () => {
		expect(originMatches("https://*.vercel.app", "https://evil.example.com")).toBe(
			false
		);
	});
});

describe("resolveAllowedOrigin", () => {
	const env = {
		ALLOWED_ORIGINS:
			"http://localhost:3000,https://masters-ai.vercel.app,https://*.vercel.app"
	} as unknown as Parameters<typeof resolveAllowedOrigin>[0];

	it("echoes an allowed exact origin", () => {
		expect(resolveAllowedOrigin(env, "http://localhost:3000")).toBe(
			"http://localhost:3000"
		);
	});

	it("echoes a wildcard-matched preview origin", () => {
		const origin = "https://masters-oxu6axla9-acme.vercel.app";
		expect(resolveAllowedOrigin(env, origin)).toBe(origin);
	});

	it("returns null for a disallowed origin", () => {
		expect(resolveAllowedOrigin(env, "https://evil.example.com")).toBeNull();
	});

	it("returns null when no origin is sent", () => {
		expect(resolveAllowedOrigin(env, null)).toBeNull();
	});
});
