"use server";

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { eq } from "drizzle-orm";
import { messages } from "@/lib/schema";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { threadId, content, role } = body;

		if (!threadId) {
			return NextResponse.json(
				{ error: "threadId is required" },
				{ status: 400 }
			);
		}

		const [newMessage] = await db
			.insert(messages)

			.values({
				threadId,
				content,
				role
			})
			.returning();

		return NextResponse.json(newMessage);
	} catch (error) {
		console.error("Failed to save message:", error);
		return NextResponse.json(
			{ error: "Failed to save message" },
			{ status: 500 }
		);
	}
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const threadId = searchParams.get("threadId");

		if (!threadId) {
			return NextResponse.json(
				{ error: "threadId is required" },
				{ status: 400 }
			);
		}

		const chatMessages = await db
			.select()
			.from(messages)
			.where(eq(messages.threadId, threadId))
			.orderBy(messages.createdAt);

		return NextResponse.json(chatMessages);
	} catch (error) {
		console.error("Failed to fetch messages:", error);
		return NextResponse.json(
			{ error: "Failed to fetch messages" },
			{ status: 500 }
		);
	}
}
