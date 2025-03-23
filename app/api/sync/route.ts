import { NextResponse } from "next/server";
import SuperJSON from "superjson";
import type { DEX_Message, DEX_Thread } from "@/localdb/dexie";
import {
	getAllThreadsAndMessagesFromDb,
	syncMessagesToDb,
	syncThreadsToDb,
	deleteThreadFromDb,
	deleteAllUserDataFromDb
} from "@/lib/queries";
import { currentUser } from "@clerk/nextjs/server";
import type { Message, Thread } from "@/lib/schema";
import { tryCatch } from "@/utils";
import {
	syncRequestSchema,
	deleteRequestSchema
} from "@/constants/syncValidationSchema";

export async function GET() {
	const user = await currentUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { data: dbData, error: fetchError } = await tryCatch(
		getAllThreadsAndMessagesFromDb(user.id)
	);

	if (fetchError || !dbData) {
		console.error("Error fetching data:", fetchError);
		return NextResponse.json(
			{ error: "Failed to fetch data" },
			{ status: 500 }
		);
	}

	const { threads, messages } = dbData;

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
}

export async function POST(request: Request) {
	const user = await currentUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { data: requestData, error: parseError } = await tryCatch(
		request.json()
	);

	if (parseError || !requestData) {
		return NextResponse.json(
			{ error: "Invalid request data" },
			{ status: 400 }
		);
	}

	// Validate request data
	const validationResult = syncRequestSchema.safeParse(requestData);
	if (!validationResult.success) {
		return NextResponse.json(
			{ error: validationResult.error.message },
			{ status: 400 }
		);
	}

	const { data: parsedData, error: superJsonError } = await tryCatch(
		Promise.resolve().then(() => {
			const { json } = validationResult.data;
			return SuperJSON.parse(json) as {
				threads: DEX_Thread[];
				messages: DEX_Message[];
			};
		})
	);

	if (superJsonError || !parsedData) {
		return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
	}

	const { threads, messages } = parsedData as {
		threads: DEX_Thread[];
		messages: DEX_Message[];
	};

	if (threads && threads.length > 0) {
		const { error: threadSyncError } = await tryCatch(
			syncThreadsToDb({
				userId: user.id,
				threads: threads as Thread[]
			})
		);

		if (threadSyncError) {
			console.error("Error syncing threads:", threadSyncError);
			return NextResponse.json(
				{ error: "Failed to sync threads" },
				{ status: 500 }
			);
		}
	}

	if (messages && messages.length > 0) {
		const { error: messageSyncError } = await tryCatch(
			syncMessagesToDb({
				userId: user.id,
				messages: messages as unknown as Message[]
			})
		);

		if (messageSyncError) {
			console.error("Error syncing messages:", messageSyncError);
			return NextResponse.json(
				{ error: "Failed to sync messages" },
				{ status: 500 }
			);
		}
	}

	return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
	const user = await currentUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { data: requestData, error: parseError } = await tryCatch(
		request.json()
	);

	if (parseError || !requestData) {
		return NextResponse.json(
			{ error: "Invalid request data" },
			{ status: 400 }
		);
	}

	// Validate request data
	const validationResult = deleteRequestSchema.safeParse(requestData);
	if (!validationResult.success) {
		return NextResponse.json(
			{ error: validationResult.error.message },
			{ status: 400 }
		);
	}

	const { deleteAll, threadId } = validationResult.data;

	// If deleteAll flag is true, delete all user data
	if (deleteAll) {
		const { data: result, error: deleteError } = await tryCatch(
			deleteAllUserDataFromDb(user.id)
		);

		if (deleteError || !result) {
			console.error("Error deleting all user data:", deleteError);
			return NextResponse.json(
				{ error: "Failed to delete all user data" },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			deletedMessagesCount: result.deletedMessagesCount,
			deletedThreadsCount: result.deletedThreadsCount
		});
	}

	// Handle single thread deletion
	if (!threadId) {
		return NextResponse.json(
			{ error: "Thread ID is required" },
			{ status: 400 }
		);
	}

	const { data: result, error: deleteError } = await tryCatch(
		deleteThreadFromDb(threadId)
	);

	if (deleteError || !result) {
		console.error("Error deleting thread:", deleteError);
		return NextResponse.json(
			{ error: "Failed to delete thread" },
			{ status: 500 }
		);
	}

	return NextResponse.json({
		success: true,
		deletedMessagesCount: result.deletedMessagesCount,
		deletedThreadsCount: result.deletedThreadsCount
	});
}
