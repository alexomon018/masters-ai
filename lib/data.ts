"use server";

import { chats, db, messages } from "@/lib/db";
import { eq } from "drizzle-orm";

// eslint-disable-next-line import/prefer-default-export
export async function saveMessage(
	message: string,
	chatId: number,
	role: string
) {
	try {
		// Save the message
		await db.insert(messages).values({
			chatId,
			content: message,
			role
		});

		// Update the chat's updatedAt timestamp
		await db
			.update(chats)
			.set({
				updatedAt: new Date()
			})
			.where(eq(chats.id, chatId));

		return { success: true };
	} catch (error) {
		console.error("Error saving message:", error);
		throw new Error("Failed to save message");
	}
}
