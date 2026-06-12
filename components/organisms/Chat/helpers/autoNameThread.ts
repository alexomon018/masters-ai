import { upsertThreadRemote } from "@/components/organisms/SideBar/threadsApi";
import {
	buildAuthQueryParams,
	getClerkToken,
	workerHttpBase
} from "./agentAuth";

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

	// Runs outside React (after a stream completes), so read the token off the
	// Clerk global rather than useAuth.
	const params = await buildAuthQueryParams(getClerkToken);
	const response = await fetch(`${base}/name-thread?${params.toString()}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ messages, model: modelId })
	});
	if (!response.ok) return;

	const { title } = (await response.json()) as { title?: string };
	if (!title || typeof title !== "string") return;

	await upsertThreadRemote(getClerkToken, { threadId, title });
}

export default autoNameThread;
