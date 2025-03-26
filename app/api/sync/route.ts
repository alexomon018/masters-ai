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
import { Logger } from "@/utils/logger";

export async function GET() {
	Logger.logGetStarted();

	const user = await currentUser();

	if (!user) {
		Logger.logGetUnauthorized();
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	Logger.logGetFetching(user.id);

	const { data: dbData, error: fetchError } = await tryCatch(
		getAllThreadsAndMessagesFromDb(user.id)
	);

	if (fetchError || !dbData) {
		Logger.logGetFetchError(user.id, fetchError?.message || "Unknown error");
		return NextResponse.json(
			{ error: "Failed to fetch data" },
			{ status: 500 }
		);
	}

	const { threads, messages } = dbData;
	Logger.logGetSuccess(user.id, threads.length, messages.length);

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

	Logger.logGetCompleted(user.id);

	return new Response(response, {
		headers: { "Content-Type": "application/json" }
	});
}

export async function POST(request: Request) {
	Logger.logPostStarted();

	const user = await currentUser();

	if (!user) {
		Logger.logPostUnauthorized();
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { data: requestData, error: parseError } = await tryCatch(
		request.json()
	);

	if (parseError || !requestData) {
		Logger.logPostParseError(
			user.id,
			parseError?.message || "No body provided"
		);
		return NextResponse.json(
			{ error: "Invalid request data" },
			{ status: 400 }
		);
	}

	// Validate request data
	const validationResult = syncRequestSchema.safeParse(requestData);
	if (!validationResult.success) {
		Logger.logPostValidationError(user.id, validationResult.error.message);
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
		Logger.logPostSuperJsonError(
			user.id,
			superJsonError?.message || "Unknown error"
		);
		return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
	}

	const { threads, messages } = parsedData as {
		threads: DEX_Thread[];
		messages: DEX_Message[];
	};

	Logger.logPostProcessing(
		user.id,
		threads?.length || 0,
		messages?.length || 0
	);

	if (threads && threads.length > 0) {
		Logger.logPostThreadSyncStarted(user.id, threads.length);

		const { error: threadSyncError } = await tryCatch(
			syncThreadsToDb({
				userId: user.id,
				threads: threads as Thread[]
			})
		);

		if (threadSyncError) {
			Logger.logPostThreadSyncError(
				user.id,
				threadSyncError?.message || "Unknown error"
			);
			return NextResponse.json(
				{ error: "Failed to sync threads" },
				{ status: 500 }
			);
		}

		Logger.logPostThreadSyncCompleted(user.id, threads.length);
	}

	if (messages && messages.length > 0) {
		Logger.logPostMessageSyncStarted(user.id, messages.length);

		const { error: messageSyncError } = await tryCatch(
			syncMessagesToDb({
				userId: user.id,
				messages: messages as unknown as Message[]
			})
		);

		if (messageSyncError) {
			Logger.logPostMessageSyncError(
				user.id,
				messageSyncError?.message || "Unknown error"
			);
			return NextResponse.json(
				{ error: "Failed to sync messages" },
				{ status: 500 }
			);
		}

		Logger.logPostMessageSyncCompleted(user.id, messages.length);
	}

	Logger.logPostCompleted(user.id);

	return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
	Logger.logDeleteStarted();

	const user = await currentUser();

	const { data: requestData, error: parseError } = await tryCatch(
		request.json()
	);

	if (parseError || !requestData) {
		Logger.logDeleteParseError(
			user?.id || "guest",
			parseError?.message || "No body provided"
		);
		return NextResponse.json(
			{ error: "Invalid request data" },
			{ status: 400 }
		);
	}

	// Validate request data
	const validationResult = deleteRequestSchema.safeParse(requestData);
	if (!validationResult.success) {
		Logger.logDeleteValidationError(
			user?.id || "guest",
			validationResult.error.message
		);
		return NextResponse.json(
			{ error: validationResult.error.message },
			{ status: 400 }
		);
	}

	const { deleteAll, threadId } = validationResult.data;

	if (deleteAll) {
		if (!user) {
			Logger.logDeleteUnauthorized();
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		Logger.logDeleteAllStarted(user.id);

		const { data: result, error: deleteError } = await tryCatch(
			deleteAllUserDataFromDb(user.id)
		);

		if (deleteError || !result) {
			Logger.logDeleteAllError(
				user.id,
				deleteError?.message || "Unknown error"
			);
			return NextResponse.json(
				{ error: "Failed to delete all user data" },
				{ status: 500 }
			);
		}

		Logger.logDeleteAllCompleted(
			user.id,
			result.deletedMessagesCount,
			result.deletedThreadsCount
		);

		return NextResponse.json({
			success: true,
			deletedMessagesCount: result.deletedMessagesCount,
			deletedThreadsCount: result.deletedThreadsCount
		});
	}

	if (!threadId) {
		Logger.logDeleteThreadMissingId(user?.id || "guest");
		return NextResponse.json(
			{ error: "Thread ID is required" },
			{ status: 400 }
		);
	}

	Logger.logDeleteThreadStarted(user?.id || "guest", threadId);

	const { data: result, error: deleteError } = await tryCatch(
		deleteThreadFromDb(threadId)
	);

	if (deleteError || !result) {
		Logger.logDeleteThreadError(
			user?.id || "guest",
			threadId,
			deleteError?.message || "Unknown error"
		);
		return NextResponse.json(
			{ error: "Failed to delete thread" },
			{ status: 500 }
		);
	}

	Logger.logDeleteThreadCompleted(
		user?.id || "guest",
		threadId,
		result.deletedMessagesCount,
		result.deletedThreadsCount
	);

	return NextResponse.json({
		success: true,
		deletedMessagesCount: result.deletedMessagesCount,
		deletedThreadsCount: result.deletedThreadsCount
	});
}
