import { dxdb } from "@/localdb/dexie";

async function ensureThread(threadId: string): Promise<string> {
	if (!threadId) {
		return dxdb.createThread({ title: "New Chat", isPinned: false });
	}

	const existing = await dxdb.threads.get(threadId);
	if (!existing) {
		await dxdb.threads.add({
			id: threadId,
			title: "New Chat",
			isPinned: false,
			created_at: new Date(),
			updated_at: new Date(),
			last_message_at: new Date(),
		});
	}

	return threadId;
}

export default ensureThread;
