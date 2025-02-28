import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import redis from "@/lib/redis";
import { messageAllowed } from "@/constants";

export async function GET(req: Request) {
	const user = await currentUser();
	const isAuthenticated = !!user;

	let ipAddress = req.headers.get("x-real-ip") as string;

	const forwardedFor = req.headers.get("x-forwarded-for") as string;
	if (!ipAddress && forwardedFor) {
		ipAddress = forwardedFor?.split(",").at(0) ?? "Unknown";
	}

	// Track message usage based on user ID or IP
	const trackingId = isAuthenticated
		? `user:${user!.id}`
		: `anonymous:${ipAddress || "unknown"}`;
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
		console.error("Error fetching data:", error);
		return NextResponse.json(
			{ error: "Failed to fetch data" },
			{ status: 500 }
		);
	}
}
