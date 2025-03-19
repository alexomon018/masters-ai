"use server";

import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage } from "ai";
import { aiUseChatAdapter } from "@upstash/rag-chat/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { messageAllowed } from "@/constants";
import redis from "@/lib/redis";
import { getRagChatInstance } from "@/ai/ragChat";
import { LLMModel } from "@/types";

export const POST = async (req: NextRequest) => {
	try {
		const user = await currentUser();
		const isAuthenticated = !!user;

		// Track message usage based on user ID or IP
		const trackingId = isAuthenticated
			? `user:${user!.id}`
			: `anonymous:${req.headers.get("x-forwarded-for") || "unknown"}`;
		const messageKey = `message_count:${trackingId}`;

		if (!isAuthenticated) {
			const messageCount = (await redis.get(messageKey)) || 0;

			if (Number(messageCount) >= messageAllowed.free) {
				return NextResponse.json(
					{
						error: `You've reached your daily message limit of ${messageAllowed.free} messages.`
					},
					{ status: 403 }
				);
			}

			// Increment their message count
			await redis.incr(messageKey);
		} else {
			// For authenticated users, check against 20 message limit
			const messageCount = (await redis.get(messageKey)) || 0;

			if (Number(messageCount) >= messageAllowed.authenticated) {
				return NextResponse.json(
					{
						error: `You've reached your daily message limit of ${messageAllowed.authenticated} messages.`
					},
					{ status: 403 }
				);
			}

			// Increment authenticated user's message count
			await redis.incr(messageKey);

			// Optional: Set expiry to reset after a day if not already set
			// This checks if TTL returns -1 (key exists but no expiry set)
			const ttl = await redis.ttl(messageKey);
			if (ttl === -1) {
				// Set expiry to 1 day (in seconds)
				await redis.expire(messageKey, 24 * 60 * 60);
			}
		}

		const body = (await req.json()) as {
			messages: VercelChatMessage[];
			model: LLMModel;
		};
		const question = body.messages.at(-1);

		if (!question) {
			return new NextResponse("question not found", { status: 400 });
		}

		const sessionId = trackingId;

		// Get the appropriate RAGChat instance
		const ragChat = getRagChatInstance(body.model, sessionId);

		const response = await ragChat.chat(question.content, {
			streaming: true,
			historyLength: 10,

			onContextFetched: (context) =>
				context.map((contextBit) => {
					const metadata = contextBit.metadata as { url: string };
					return {
						id: contextBit.id,
						data: JSON.stringify({
							text: contextBit.data,
							url: metadata.url,
							userData: {
								name: user?.unsafeMetadata.name || "",
								occupation: user?.unsafeMetadata.occupation || "",
								traits: user?.unsafeMetadata.traits || "",
								preferences: user?.unsafeMetadata.preferences || ""
							}
						}),
						metadata: contextBit.metadata
					};
				})
		});

		return aiUseChatAdapter(response);
	} catch (e: unknown) {
		if (e instanceof Error) {
			return NextResponse.json({ error: e.message }, { status: 500 });
		}
		return NextResponse.json(
			{ error: "An unknown error occurred" },
			{ status: 500 }
		);
	}
};
