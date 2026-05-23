import { upsertThreadRemote } from "@/components/organisms/SideBar/threadsApi";

interface AutoNameInput {
	threadId: string;
	userMessage: string;
	assistantMessage: string;
	modelId: string;
}

// Posts the first user→assistant exchange to /api/name-thread (server-side
// Clerk session), then persists the resulting title to the worker's
// /threads endpoint so the sidebar reflects it.
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

	// Need a Clerk token for the worker upsert. We can't import useAuth in
	// a non-hook helper, so we read the Clerk client off the window — Clerk
	// attaches itself there once loaded. Falls back gracefully to anon.
	const getToken = async () => {
		const clerk = (window as unknown as { Clerk?: { session?: { getToken?: () => Promise<string | null> } } }).Clerk;
		return clerk?.session?.getToken ? clerk.session.getToken() : null;
	};

	await upsertThreadRemote(getToken, { threadId, title });
}

export default autoNameThread;
