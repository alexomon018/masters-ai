import { NextResponse } from "next/server";
import SuperJSON from "superjson";
import type { DEX_Message, DEX_Thread } from "@/localdb/dexie";
import {
	getAllThreadsAndMessagesFromDb,
	syncMessagesToDb,
	syncThreadsToDb
} from "@/lib/queries";
import { currentUser } from "@clerk/nextjs/server";

export async function GET() {
	const user = await currentUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { threads, messages } = await getAllThreadsAndMessagesFromDb(user.id);

		const parsedThreads = threads.map(
			(t) => SuperJSON.deserialize(t.data!) as DEX_Thread
		);
		const parsedMessages = messages.map(
			(m) => SuperJSON.deserialize(m.data!) as DEX_Message
		);

		const response = SuperJSON.stringify({
			threads: parsedThreads,
			messages: parsedMessages
		});

		return new Response(response, {
			headers: { "Content-Type": "application/json" }
		});
	} catch (error) {
		console.error("Error fetching data:", error);
		return NextResponse.json(
			{ error: "Failed to fetch data" },
			{ status: 500 }
		);
	}
}

export async function POST(request: Request) {
	const user = await currentUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { threads, messages } = await request.json();

	// Sync threads and messages to the database
	if (threads && threads.length > 0) {
		await syncThreadsToDb({
			userId: user.id,
			threads
		});
	}

	if (messages && messages.length > 0) {
		await syncMessagesToDb({
			userId: user.id,
			messages
		});
	}

	return NextResponse.json({ success: true });
}
