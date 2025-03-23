import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/settings(.*)"]);

export default clerkMiddleware(
	async (auth, req) => {
		const { userId } = await auth();

		if (req.nextUrl.pathname === "/auth" && userId) {
			return Response.redirect(new URL("/chat", req.url));
		}

		if (isProtectedRoute(req)) await auth.protect();

		return NextResponse.next();
	},
	{ debug: true }
);

export const config = {
	matcher: ["/((?!.*\\..*|_next).*)", "/"]
};
