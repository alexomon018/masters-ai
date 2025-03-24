type LogType =
	| "sync_get_started"
	| "sync_get_unauthorized"
	| "sync_get_fetching"
	| "sync_get_fetch_error"
	| "sync_get_success"
	| "sync_get_completed"
	| "sync_post_started"
	| "sync_post_unauthorized"
	| "sync_post_parse_error"
	| "sync_post_validation_error"
	| "sync_post_superjson_error"
	| "sync_post_processing"
	| "sync_post_thread_sync_started"
	| "sync_post_thread_sync_error"
	| "sync_post_thread_sync_completed"
	| "sync_post_message_sync_started"
	| "sync_post_message_sync_error"
	| "sync_post_message_sync_completed"
	| "sync_post_completed"
	| "sync_delete_started"
	| "sync_delete_unauthorized"
	| "sync_delete_parse_error"
	| "sync_delete_validation_error"
	| "sync_delete_all_started"
	| "sync_delete_all_error"
	| "sync_delete_all_completed"
	| "sync_delete_thread_missing_id"
	| "sync_delete_thread_started"
	| "sync_delete_thread_error"
	| "sync_delete_thread_completed"
	| "masters_request_started"
	| "masters_user_identified"
	| "masters_request_parse_error"
	| "masters_validation_error"
	| "masters_question_not_found"
	| "masters_message_limit_check"
	| "masters_message_limit_exceeded"
	| "masters_message_limit_error"
	| "masters_rag_chat_started"
	| "masters_context_fetched"
	| "masters_request_completed"
	| "masters_context_error"
	| "masters_rag_error";

interface BaseLogData {
	timestamp?: string;
	userId?: string;
	trackingId?: string;
	error?: string;
	threadCount?: number;
	messageCount?: number;
	threadId?: string;
	deletedMessagesCount?: number;
	deletedThreadsCount?: number;
	isAuthenticated?: boolean;
	currentCount?: number;
	limit?: number;
	model?: string;
	contextCount?: number;
	duration?: number;
}

interface SyncGetLogData extends BaseLogData {
	type:
		| "sync_get_started"
		| "sync_get_unauthorized"
		| "sync_get_fetching"
		| "sync_get_fetch_error"
		| "sync_get_success"
		| "sync_get_completed";
}

interface SyncPostLogData extends BaseLogData {
	type:
		| "sync_post_started"
		| "sync_post_unauthorized"
		| "sync_post_parse_error"
		| "sync_post_validation_error"
		| "sync_post_superjson_error"
		| "sync_post_processing"
		| "sync_post_thread_sync_started"
		| "sync_post_thread_sync_error"
		| "sync_post_thread_sync_completed"
		| "sync_post_message_sync_started"
		| "sync_post_message_sync_error"
		| "sync_post_message_sync_completed"
		| "sync_post_completed";
}

interface SyncDeleteLogData extends BaseLogData {
	type:
		| "sync_delete_started"
		| "sync_delete_unauthorized"
		| "sync_delete_parse_error"
		| "sync_delete_validation_error"
		| "sync_delete_all_started"
		| "sync_delete_all_error"
		| "sync_delete_all_completed"
		| "sync_delete_thread_missing_id"
		| "sync_delete_thread_started"
		| "sync_delete_thread_error"
		| "sync_delete_thread_completed";
}

interface MastersLogData extends BaseLogData {
	type:
		| "masters_request_started"
		| "masters_user_identified"
		| "masters_request_parse_error"
		| "masters_validation_error"
		| "masters_question_not_found"
		| "masters_message_limit_check"
		| "masters_message_limit_exceeded"
		| "masters_message_limit_error"
		| "masters_rag_chat_started"
		| "masters_context_fetched"
		| "masters_request_completed";
}

type LogData =
	| SyncGetLogData
	| SyncPostLogData
	| SyncDeleteLogData
	| MastersLogData;

export class Logger {
	private static startTime: number = Date.now();
	private static enabled: boolean =
		process.env.NODE_ENV === "production" ||
		process.env.ENABLE_LOGGING === "true";

	private static log(
		type: LogType,
		data: Omit<LogData, "type" | "timestamp" | "duration">
	) {
		if (Logger.enabled) {
			console.log(
				JSON.stringify({
					type,
					timestamp: new Date().toISOString(),
					...data,
					duration: Date.now() - Logger.startTime
				})
			);
		}
	}

	// Optional: Method to enable/disable logging programmatically
	static setEnabled(enabled: boolean) {
		Logger.enabled = enabled;
	}

	// GET logs
	static logGetStarted() {
		Logger.log("sync_get_started", {});
	}

	static logGetUnauthorized() {
		Logger.log("sync_get_unauthorized", {});
	}

	static logGetFetching(userId: string) {
		Logger.log("sync_get_fetching", { userId });
	}

	static logGetFetchError(userId: string, error: string) {
		Logger.log("sync_get_fetch_error", { userId, error });
	}

	static logGetSuccess(
		userId: string,
		threadCount: number,
		messageCount: number
	) {
		Logger.log("sync_get_success", { userId, threadCount, messageCount });
	}

	static logGetCompleted(userId: string) {
		Logger.log("sync_get_completed", { userId });
	}

	// POST logs
	static logPostStarted() {
		Logger.log("sync_post_started", {});
	}

	static logPostUnauthorized() {
		Logger.log("sync_post_unauthorized", {});
	}

	static logPostParseError(userId: string, error: string) {
		Logger.log("sync_post_parse_error", { userId, error });
	}

	static logPostValidationError(userId: string, error: string) {
		Logger.log("sync_post_validation_error", { userId, error });
	}

	static logPostSuperJsonError(userId: string, error: string) {
		Logger.log("sync_post_superjson_error", { userId, error });
	}

	static logPostProcessing(
		userId: string,
		threadCount: number,
		messageCount: number
	) {
		Logger.log("sync_post_processing", { userId, threadCount, messageCount });
	}

	static logPostThreadSyncStarted(userId: string, threadCount: number) {
		Logger.log("sync_post_thread_sync_started", { userId, threadCount });
	}

	static logPostThreadSyncError(userId: string, error: string) {
		Logger.log("sync_post_thread_sync_error", { userId, error });
	}

	static logPostThreadSyncCompleted(userId: string, threadCount: number) {
		Logger.log("sync_post_thread_sync_completed", { userId, threadCount });
	}

	static logPostMessageSyncStarted(userId: string, messageCount: number) {
		Logger.log("sync_post_message_sync_started", { userId, messageCount });
	}

	static logPostMessageSyncError(userId: string, error: string) {
		Logger.log("sync_post_message_sync_error", { userId, error });
	}

	static logPostMessageSyncCompleted(userId: string, messageCount: number) {
		Logger.log("sync_post_message_sync_completed", { userId, messageCount });
	}

	static logPostCompleted(userId: string) {
		Logger.log("sync_post_completed", { userId });
	}

	// DELETE logs
	static logDeleteStarted() {
		Logger.log("sync_delete_started", {});
	}

	static logDeleteUnauthorized() {
		Logger.log("sync_delete_unauthorized", {});
	}

	static logDeleteParseError(userId: string, error: string) {
		Logger.log("sync_delete_parse_error", { userId, error });
	}

	static logDeleteValidationError(userId: string, error: string) {
		Logger.log("sync_delete_validation_error", { userId, error });
	}

	static logDeleteAllStarted(userId: string) {
		Logger.log("sync_delete_all_started", { userId });
	}

	static logDeleteAllError(userId: string, error: string) {
		Logger.log("sync_delete_all_error", { userId, error });
	}

	static logDeleteAllCompleted(
		userId: string,
		deletedMessagesCount: number,
		deletedThreadsCount: number
	) {
		Logger.log("sync_delete_all_completed", {
			userId,
			deletedMessagesCount,
			deletedThreadsCount
		});
	}

	static logDeleteThreadMissingId(userId: string) {
		Logger.log("sync_delete_thread_missing_id", { userId });
	}

	static logDeleteThreadStarted(userId: string, threadId: string) {
		Logger.log("sync_delete_thread_started", { userId, threadId });
	}

	static logDeleteThreadError(userId: string, threadId: string, error: string) {
		Logger.log("sync_delete_thread_error", { userId, threadId, error });
	}

	static logDeleteThreadCompleted(
		userId: string,
		threadId: string,
		deletedMessagesCount: number,
		deletedThreadsCount: number
	) {
		Logger.log("sync_delete_thread_completed", {
			userId,
			threadId,
			deletedMessagesCount,
			deletedThreadsCount
		});
	}

	// Masters logs
	static logMastersRequestStarted() {
		Logger.log("masters_request_started", {});
	}

	static logMastersUserIdentified(
		trackingId: string,
		isAuthenticated: boolean
	) {
		Logger.log("masters_user_identified", { trackingId, isAuthenticated });
	}

	static logMastersRequestParseError(trackingId: string, error: string) {
		Logger.log("masters_request_parse_error", { trackingId, error });
	}

	static logMastersValidationError(trackingId: string, error: string) {
		Logger.log("masters_validation_error", { trackingId, error });
	}

	static logMastersQuestionNotFound(trackingId: string) {
		Logger.log("masters_question_not_found", { trackingId });
	}

	static logMastersMessageLimitCheck(
		trackingId: string,
		isAuthenticated: boolean,
		currentCount: number,
		limit: number
	) {
		Logger.log("masters_message_limit_check", {
			trackingId,
			isAuthenticated,
			currentCount,
			limit
		});
	}

	static logMastersMessageLimitExceeded(
		trackingId: string,
		currentCount: number,
		limit: number
	) {
		Logger.log("masters_message_limit_exceeded", {
			trackingId,
			currentCount,
			limit
		});
	}

	static logMastersMessageLimitError(trackingId: string, error: string) {
		Logger.log("masters_message_limit_error", { trackingId, error });
	}

	static logMastersRagChatStarted(trackingId: string, model: string) {
		Logger.log("masters_rag_chat_started", { trackingId, model });
	}

	static logMastersContextFetched(trackingId: string, contextCount: number) {
		Logger.log("masters_context_fetched", { trackingId, contextCount });
	}

	static logMastersRequestCompleted(trackingId: string) {
		Logger.log("masters_request_completed", { trackingId });
	}

	static logMastersContextError(trackingId: string, error: string) {
		Logger.log("masters_context_error", { trackingId, error });
	}

	static logMastersRagError(trackingId: string, error: string) {
		Logger.log("masters_rag_error", { trackingId, error });
	}
}
