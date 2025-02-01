"use server";

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { chats } from "@/lib/schema";

export async function POST() {
	try {
		const [newChat] = await db
			.insert(chats)
			.values({})
			.returning({ id: chats.id });

		return NextResponse.json(newChat);
	} catch (error) {
		console.error("Failed to create chat:", error);
		return NextResponse.json(
			{ error: "Failed to create chat" },
			{ status: 500 }
		);
	}
}

export async function GET() {
	try {
		const allChats = await db.select().from(chats);

		return NextResponse.json(allChats);
	} catch (error) {
		console.error("Failed to fetch chats:", error);
		return NextResponse.json(
			{ error: "Failed to fetch chats" },
			{ status: 500 }
		);
	}
}
