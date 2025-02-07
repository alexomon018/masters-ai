import { dexie } from "./dexie";
import superjson from "superjson";

export async function createMessage(threadId: string, userContent: string) {
	// 1) Create the user message in Dexie
	await dexie.addMessage({
		threadId,
		role: "user",
		content: userContent,
		status: "done"
	});

	// 2) Fetch all messages in this thread, so we can send them as context
	const allMessages = await dexie.getThreadMessages(threadId);
	const contextMessages = allMessages.map((m) => ({
		role: m.role,
		content: m.content
	}));

	// 3) Create a placeholder assistant message in Dexie
	const assistantMessageId = await dexie.addMessage({
		threadId,
		role: "assistant",
		content: "",
		status: "waiting"
	});
}
