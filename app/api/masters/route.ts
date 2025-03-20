import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage } from "ai";
import { aiUseChatAdapter } from "@upstash/rag-chat/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { messageAllowed } from "@/constants";
import redis from "@/lib/redis";
import { tryCatch } from "@utils";
import { getRagChatInstance } from "@/ai/ragChat";
import { LLMModel } from "@/types";

async function checkMessageLimit(trackingId: string, isAuthenticated: boolean) {
	const messageKey = `message_count:${trackingId}`;
	const messageCount = (await redis.get(messageKey)) || 0;
	const limit = isAuthenticated
		? messageAllowed.authenticated
		: messageAllowed.free;

	if (Number(messageCount) >= limit) {
		throw new Error(
			`You've reached your daily message limit of ${limit} messages.`
		);
	}

	await redis.incr(messageKey);

	// Set expiry for authenticated users if not already set
	if (isAuthenticated) {
		const ttl = await redis.ttl(messageKey);
		if (ttl === -1) {
			await redis.expire(messageKey, 24 * 60 * 60);
		}
	}
}

export const POST = async (req: NextRequest) => {
	const user = await currentUser();
	const isAuthenticated = !!user;
	const trackingId = isAuthenticated
		? `user:${user!.id}`
		: `anonymous:${req.headers.get("x-forwarded-for") || "unknown"}`;

	const { data: body, error: parseError } = await tryCatch<{
		messages: VercelChatMessage[];
		model: LLMModel;
	}>(req.json());

	if (parseError || !body) {
		return NextResponse.json(
			{ error: "Invalid request body" },
			{ status: 400 }
		);
	}

	const question = body.messages.at(-1);
	if (!question) {
		return NextResponse.json({ error: "Question not found" }, { status: 400 });
	}

	const { error: limitError } = await tryCatch(
		checkMessageLimit(trackingId, isAuthenticated)
	);

	if (limitError) {
		return NextResponse.json({ error: limitError.message }, { status: 403 });
	}

	const ragChat = getRagChatInstance(body.model, trackingId);
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
};
