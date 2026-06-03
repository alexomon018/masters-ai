import { upsertThreadRemote } from "@/components/organisms/SideBar/threadsApi";
import { buildAuthQueryParams, workerHttpBase } from "./agentAuth";

interface AutoNameInput {
	threadId: string;
	userMessage: string;
	assistantMessage: string;
	modelId: string;
}

async function autoNameThread({
	threadId,
	userMessage,
	assistantMessage,
	modelId
}: AutoNameInput) {
	const base = workerHttpBase();
	if (!base) return;

	const messages = [
		{ role: "user", content: userMessage },
		{ role: "assistant", content: assistantMessage }
	];

	// Can't use useAuth here — read Clerk off window once loaded. The worker
	// resolves the same ticket/anonId scheme as the chat connection.
	const getToken = async () => {
		const clerk = (
			window as unknown as {
				Clerk?: { session?: { getToken?: () => Promise<string | null> } };
			}
		).Clerk;
		return clerk?.session?.getToken ? clerk.session.getToken() : null;
	};

	const params = await buildAuthQueryParams(getToken);
	const response = await fetch(`${base}/name-thread?${params.toString()}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ messages, model: modelId })
	});
	if (!response.ok) return;

	const { title } = (await response.json()) as { title?: string };
	if (!title || typeof title !== "string") return;

	await upsertThreadRemote(getToken, { threadId, title });
}

export default autoNameThread;
