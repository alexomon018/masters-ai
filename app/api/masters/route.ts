import { NextRequest, NextResponse } from "next/server";
import { aiUseChatAdapter } from "@upstash/rag-chat/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { messageAllowed } from "@/constants";
import { mastersRequestSchema } from "@/constants/llmValidationSchema";
import redis from "@/lib/redis";
import { tryCatch } from "@utils";
import { getRagChatInstance } from "@/ai/ragChat";
import { Logger } from "@/utils/logger";

async function checkMessageLimit(trackingId: string, isAuthenticated: boolean) {
	const messageKey = `message_count:${trackingId}`;
	const messageCount = (await redis.get(messageKey)) || 0;
	const limit = isAuthenticated
		? messageAllowed.authenticated
		: messageAllowed.free;

	Logger.logMastersMessageLimitCheck(
		trackingId,
		isAuthenticated,
		Number(messageCount),
		limit
	);

	if (Number(messageCount) >= limit) {
		Logger.logMastersMessageLimitExceeded(
			trackingId,
			Number(messageCount),
			limit
		);
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
	Logger.logMastersRequestStarted();

	const user = await currentUser();
	const isAuthenticated = !!user;
	const trackingId = isAuthenticated
		? `user:${user!.id}`
		: `anonymous:${req.headers.get("x-forwarded-for") || "unknown"}`;

	Logger.logMastersUserIdentified(trackingId, isAuthenticated);

	const { data: body, error: parseError } = await tryCatch(req.json());

	if (parseError || !body) {
		Logger.logMastersRequestParseError(
			trackingId,
			parseError?.message || "No body provided"
		);
		return NextResponse.json(
			{ error: "Invalid request body" },
			{ status: 400 }
		);
	}

	// Validate request data using Zod schema
	const validationResult = mastersRequestSchema.safeParse(body);
	if (!validationResult.success) {
		Logger.logMastersValidationError(
			trackingId,
			validationResult.error.message
		);
		return NextResponse.json(
			{ error: validationResult.error.message },
			{ status: 400 }
		);
	}

	const { messages, model } = validationResult.data;
	const question = messages.at(-1);

	if (!question) {
		Logger.logMastersQuestionNotFound(trackingId);
		return NextResponse.json({ error: "Question not found" }, { status: 400 });
	}

	const { error: limitError } = await tryCatch(
		checkMessageLimit(trackingId, isAuthenticated)
	);

	if (limitError) {
		Logger.logMastersMessageLimitError(trackingId, limitError.message);
		return NextResponse.json({ error: limitError.message }, { status: 403 });
	}

	Logger.logMastersRagChatStarted(trackingId, model);

	const ragChat = getRagChatInstance(model, trackingId);
	const response = await ragChat.chat(question.content, {
		streaming: true,
		timeout: 60000,
		historyLength: 10,
		onContextFetched: (context) => {
			Logger.logMastersContextFetched(trackingId, context.length);
			return context.map((contextBit) => {
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
			});
		}
	});

	Logger.logMastersRequestCompleted(trackingId);

	return aiUseChatAdapter(response);
};
