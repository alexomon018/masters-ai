import { upsertThreadRemote } from "@/components/organisms/SideBar/threadsApi";

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
	const messages = [
		{ role: "user", content: userMessage },
		{ role: "assistant", content: assistantMessage }
	];

	const response = await fetch("/api/name-thread", {
		method: "POST",
		body: JSON.stringify({ messages, model: modelId })
	});
	if (!response.ok) return;

	const title = (await response.json()) as string;
	if (!title || typeof title !== "string") return;

	// Can't use useAuth here — read Clerk off window once loaded.
	const getToken = async () => {
		const clerk = (window as unknown as { Clerk?: { session?: { getToken?: () => Promise<string | null> } } }).Clerk;
		return clerk?.session?.getToken ? clerk.session.getToken() : null;
	};

	await upsertThreadRemote(getToken, { threadId, title });
}

export default autoNameThread;
