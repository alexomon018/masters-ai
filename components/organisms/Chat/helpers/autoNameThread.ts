import { dxdb } from "@/localdb/dexie";

async function autoNameThread(
	threadId: string,
	content: string,
	modelId: string
) {
	const thread = await dxdb.threads.get(threadId);
	if (thread?.title !== "New Chat") return;

	const response = await fetch("/api/name-thread", {
		method: "POST",
		body: JSON.stringify({
			messages: [{ role: "assistant", content }],
			model: modelId,
		}),
	});
	const title = await response.json();
	await dxdb.updateThread(threadId, { title });
}

export default autoNameThread;
