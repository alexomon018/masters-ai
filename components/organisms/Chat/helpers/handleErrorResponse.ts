import { dxdb } from "@/localdb/dexie";
import { messageAllowed } from "@/constants";

async function handleErrorResponse(
	status: number,
	threadId: string
): Promise<boolean> {
	if (status === 403) {
		await dxdb.addMessage({
			content: `You've reached your daily message limit of ${messageAllowed.free} messages.`,
			role: "assistant",
			threadId,
		});
		return true;
	}

	if (status === 429) {
		await dxdb.addMessage({
			content:
				"Too many requests. Please wait a moment before sending another message.",
			role: "assistant",
			threadId,
		});
		return true;
	}

	return false;
}

export default handleErrorResponse;
