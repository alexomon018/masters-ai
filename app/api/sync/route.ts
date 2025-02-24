import { NextResponse } from "next/server";
import SuperJSON from "superjson";
import type { DEX_Message, DEX_Thread } from "@/localdb/dexie";
import {
	getAllThreadsAndMessagesFromDb,
	syncMessagesToDb,
	syncThreadsToDb
} from "@lib/queries";
import { currentUser } from "@clerk/nextjs/server";

export async function GET() {
	const user = await currentUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { threads, messages } = await getAllThreadsAndMessagesFromDb(user.id);

	const syncedThreads = await syncThreadsToDb(threads);
	const syncedMessages = await syncMessagesToDb(messages);

	const response = SuperJSON.stringify({
		syncedThreads,
		syncedMessages
	});

	return new Response(response, {});
}
