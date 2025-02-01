"use server";

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { eq } from "drizzle-orm";
import { messages } from "@/lib/schema";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { chatId, content, role } = body;

		if (!chatId) {
			return NextResponse.json(
				{ error: "chatId is required" },
				{ status: 400 }
			);
		}

		console.log({ chatId, content, role });

		const [newMessage] = await db
			.insert(messages)
			.values({
				chatId,
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
		const chatId = searchParams.get("chatId");

		if (!chatId) {
			return NextResponse.json(
				{ error: "chatId is required" },
				{ status: 400 }
			);
		}

		const chatMessages = await db
			.select()
			.from(messages)
			.where(eq(messages.chatId, chatId))
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
