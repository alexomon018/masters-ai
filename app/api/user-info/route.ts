import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import redis from "@/lib/redis";

export async function GET(req: Request) {
	const user = await currentUser();
	const isAuthenticated = !!user;

	// Track message usage based on user ID or IP
	const trackingId = isAuthenticated
		? `user:${user!.id}`
		: `anonymous:${req.headers.get("x-forwarded-for") || "unknown"}`;
	const messageKey = `message_count:${trackingId}`;

	try {
		const messageCount = Number((await redis.get(messageKey)) || 0);
		const ttl = await redis.ttl(messageKey);

		// Calculate reset date (if TTL exists)
		let resetsAt = "never";
		if (ttl > 0) {
			const resetDate = new Date();
			resetDate.setSeconds(resetDate.getSeconds() + ttl);
			resetsAt = resetDate.toLocaleDateString();
		}

		// Set limits based on authentication status
		const maxMessages = isAuthenticated ? 20 : 10;
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
