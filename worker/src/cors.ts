import type { Env } from "./env";

// Matches a request origin against an allowed entry. A `*` in the entry is a
// single-DNS-label wildcard, so `https://*.vercel.app` matches any per-deploy
// Vercel preview URL (e.g. https://masters-ad1sirxer-acme.vercel.app).
export function originMatches(pattern: string, origin: string): boolean {
	if (pattern === origin) return true;
	if (!pattern.includes("*")) return false;
	const regex = pattern
		.split("*")
		.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join("[^.]*");
	return new RegExp(`^${regex}$`).test(origin);
}

export function resolveAllowedOrigin(
	env: Env,
	requestOrigin: string | null
): string | null {
	if (!requestOrigin) return null;
	const allowed = (env.ALLOWED_ORIGINS ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	return allowed.some((pattern) => originMatches(pattern, requestOrigin))
		? requestOrigin
		: null;
}
