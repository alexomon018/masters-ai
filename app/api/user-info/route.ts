import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import redis from "@/lib/redis";
import { messageAllowed } from "@/constants";
import { verifyAnonId } from "@/utils/anonId";

const ANON_COOKIE = "masters_anon_id";

export async function GET() {
	const user = await currentUser();
	const isAuthenticated = !!user;

	// Mirror the worker's identity scheme (worker/src/clerk-auth.ts) so the
	// Redis key the UI reads is the same one the worker increments. The
	// anon cookie is `<rawId>.<sig>`; the worker stores quotas under
	// `anon:<rawId>` (signature stripped after verification).
	let trackingId: string;
	if (isAuthenticated) {
		trackingId = `user:${user!.id}`;
	} else {
		const cookieStore = await cookies();
		const cookieValue = cookieStore.get(ANON_COOKIE)?.value;
		const secret = process.env.ANON_ID_SECRET;
		const rawId =
			cookieValue && secret
				? await verifyAnonId(cookieValue, secret)
				: null;
		if (!rawId) {
			return NextResponse.json(
				{
					userId: "anonymous",
					used: 0,
					remaining: messageAllowed.free,
					total: messageAllowed.free,
					resetsAt: "never"
				},
				{ status: 200 }
			);
		}
		trackingId = `anon:${rawId}`;
	}
	const messageKey = `message_count:${trackingId}`;

	try {
		// Get the message count from Redis, defaulting to 0 if it doesn't exist
		const messageCount = (await redis.exists(messageKey))
			? Number(await redis.get(messageKey))
			: 0;

		const ttl = await redis.ttl(messageKey);

		let resetsAt = "never";
		if (ttl > 0) {
			const resetDate = new Date();
			resetDate.setSeconds(resetDate.getSeconds() + ttl);
			resetsAt = resetDate.toLocaleDateString();
		}

		// Set limits based on authentication status
		const maxMessages = isAuthenticated
			? messageAllowed.authenticated
			: messageAllowed.free;
		const remainingMessages = Math.max(0, maxMessages - messageCount);

		const usageData = {
			userId: isAuthenticated ? user!.id : "anonymous",
			used: messageCount,
			remaining: remainingMessages,
			total: maxMessages,
			resetsAt
		};

		return NextResponse.json(usageData, { status: 200 });
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error fetching data:", error);
		return NextResponse.json(
			{ error: "Failed to fetch data" },
			{ status: 500 }
		);
	}
}
