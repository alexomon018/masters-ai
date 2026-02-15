import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { currentUser } from "@clerk/nextjs/server";
import { messageAllowed } from "@/constants";
import { mastersRequestSchema } from "@/constants/llmValidationSchema";
import redis from "@/lib/redis";
import { tryCatch } from "@utils";
import { runAgent } from "@/ai/agent";
import { Logger } from "@/utils/logger";

const ratelimit = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(3, "10 s"),
});

async function checkMessageLimit(
	trackingId: string,
	isAuthenticated: boolean
) {
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

	const ttl = await redis.ttl(messageKey);
	if (ttl === -1) {
		await redis.expire(messageKey, 24 * 60 * 60);
	}
}

export const POST = async (req: NextRequest) => {
	Logger.logMastersRequestStarted();

	// Run auth and body parsing in parallel — they're independent
	const [user, { data: body, error: parseError }] = await Promise.all([
		currentUser(),
		tryCatch(req.json()),
	]);

	const isAuthenticated = !!user;
	const trackingId = isAuthenticated
		? `user:${user!.id}`
		: `anonymous:${req.headers.get("x-forwarded-for") || "unknown"}`;

	Logger.logMastersUserIdentified(trackingId, isAuthenticated);

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
		return NextResponse.json(
			{ error: "Question not found" },
			{ status: 400 }
		);
	}

	// Run message limit check and rate limit in parallel
	const [{ error: limitError }, { success: rateLimitOk }] =
		await Promise.all([
			tryCatch(checkMessageLimit(trackingId, isAuthenticated)),
			ratelimit.limit(trackingId),
		]);

	if (limitError) {
		Logger.logMastersMessageLimitError(trackingId, limitError.message);
		return NextResponse.json(
			{ error: limitError.message },
			{ status: 403 }
		);
	}

	if (!rateLimitOk) {
		return NextResponse.json(
			{ error: "Too many requests. Please wait a moment." },
			{ status: 429 }
		);
	}

	Logger.logMastersRagChatStarted(trackingId, model);

	const result = runAgent({
		messages: messages.map((m) => ({
			role: m.role as "user" | "assistant" | "system",
			content: m.content,
		})),
		model,
		userData: user
			? {
					name: (user.unsafeMetadata.name as string) || "",
					occupation: (user.unsafeMetadata.occupation as string) || "",
					traits: (user.unsafeMetadata.traits as string) || "",
					preferences:
						(user.unsafeMetadata.preferences as string) || "",
				}
			: undefined,
	});

	Logger.logMastersRequestCompleted(trackingId);

	return result.toTextStreamResponse();
};
