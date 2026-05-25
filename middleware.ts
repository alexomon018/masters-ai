import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { generateRawAnonId, signAnonId, verifyAnonId } from "@/utils/anonId";

const isProtectedRoute = createRouteMatcher(["/settings(.*)"]);

// Cookie that identifies anonymous visitors across requests. Read by the
// browser when connecting to the chat agent over WebSocket; the worker uses
// it as the per-day quota key (`anon:<id>`). Lives alongside Clerk.
//
// Now HMAC-signed: format `<rawId>.<base64url(HMAC-SHA256(rawId))>`.
// Unsigned values from before this change are detected and reissued. The
// signature uses ANON_ID_SECRET, which must match the worker. Without
// signing, a hostile user could spoof any anonId to bypass per-day quotas.
const ANON_COOKIE = "masters_anon_id";
const ONE_YEAR_S = 60 * 60 * 24 * 365;

export default clerkMiddleware(async (auth, req) => {
	const { userId } = await auth();

	if (req.nextUrl.pathname === "/auth" && userId) {
		return Response.redirect(new URL("/chat", req.url));
	}

	if (isProtectedRoute(req)) await auth.protect();

	const res = NextResponse.next();

	const secret = process.env.ANON_ID_SECRET;
	if (!secret) {
		// Fail loudly in logs but don't block traffic — the worker will
		// reject unsigned anonIds anyway, so anon chat just won't work until
		// the secret is configured.
		// eslint-disable-next-line no-console
		console.error("[middleware] ANON_ID_SECRET is not set");
		return res;
	}

	const existing = req.cookies.get(ANON_COOKIE)?.value;
	const verified = existing ? await verifyAnonId(existing, secret) : null;

	if (!verified) {
		const signed = await signAnonId(generateRawAnonId(), secret);
		// NOT httpOnly: the browser reads this in client code and forwards it
		// to the chat worker as the `?anonId` query param on the WS upgrade.
		res.cookies.set(ANON_COOKIE, signed, {
			httpOnly: false,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
			maxAge: ONE_YEAR_S,
			path: "/"
		});
	}

	return res;
});

export const config = {
	matcher: ["/((?!.*\\..*|_next).*)", "/"]
};
