"use server";

import { NextResponse } from "next/server";
import db from "@/lib/db";
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
