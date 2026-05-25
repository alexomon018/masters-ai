import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import { runLLM, type NameThreadMessage } from "@/ai/llm";
import { tryCatch } from "@/utils";
import { nameThreadSchema } from "@/constants/llmValidationSchema";
import { verifyAnonId } from "@/utils/anonId";
import redis from "@/lib/redis";

const ANON_COOKIE = "masters_anon_id";
// Per-day cap on naming requests, by tracking id. Same identity scheme as
// chat quota — keeps a malicious caller from burning Anthropic credits via
// the unauthenticated naming endpoint.
const NAME_LIMIT_PER_DAY = 100;
const ONE_DAY_S = 24 * 60 * 60;

async function resolveTrackingId(): Promise<string | null> {
	const user = await currentUser();
	if (user?.id) return `user:${user.id}`;

	const cookieStore = await cookies();
	const cookieValue = cookieStore.get(ANON_COOKIE)?.value;
	const secret = process.env.ANON_ID_SECRET;
	if (!cookieValue || !secret) return null;
	const rawId = await verifyAnonId(cookieValue, secret);
	return rawId ? `anon:${rawId}` : null;
}

async function checkRateLimit(trackingId: string): Promise<boolean> {
	const key = `name_thread_count:${trackingId}`;
	const next = await redis.incr(key);
	if (next === 1) {
		await redis.expire(key, ONE_DAY_S);
	}
	if (next > NAME_LIMIT_PER_DAY) {
		await redis.decr(key);
		return false;
	}
	return true;
}

export async function POST(request: Request) {
	// AuthN: require Clerk session OR a valid signed anonId cookie.
	// Without this gate, anyone can curl this endpoint and burn Anthropic
	// credits — there's no per-IP rate limit at the network edge.
	const trackingId = await resolveTrackingId();
	if (!trackingId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const allowed = await checkRateLimit(trackingId);
	if (!allowed) {
		return NextResponse.json(
			{ error: "Daily naming limit reached" },
			{ status: 429 }
		);
	}

	const body = await request.json();

	const validationResult = nameThreadSchema.safeParse(body);
	if (!validationResult.success) {
		return NextResponse.json(
			{ error: "Invalid request body", details: validationResult.error.issues },
			{ status: 400 }
		);
	}

	const { messages } = validationResult.data;

	const { data, error } = await tryCatch(
		runLLM(messages as NameThreadMessage[])
	);

	if (error) {
		// eslint-disable-next-line no-console
		console.error("Error naming thread:", error);
		return NextResponse.json(
			{ error: "Failed to name thread" },
			{ status: 500 }
		);
	}

	return NextResponse.json(data);
}
