// Mirror of the worker's ChatErrorCode (worker/src/chat-errors.ts). The worker
// encodes chat failures as `${CODE}:${message}`; we parse that back so the UI
// can pick a banner without leaking raw error text.
export type ChatErrorCode =
	| "QUOTA_EXCEEDED"
	| "PROVIDER_UNAVAILABLE"
	| "NO_API_KEY"
	| "UNKNOWN";

const KNOWN_CODES: ReadonlySet<ChatErrorCode> = new Set<ChatErrorCode>([
	"QUOTA_EXCEEDED",
	"PROVIDER_UNAVAILABLE",
	"NO_API_KEY",
	"UNKNOWN"
]);

export interface ParsedChatError {
	code: ChatErrorCode;
	message: string;
}

const FALLBACK: ParsedChatError = {
	code: "UNKNOWN",
	message: "Something went wrong. Please try again."
};

export function parseChatError(error: Error | undefined): ParsedChatError {
	if (!error) return FALLBACK;
	const raw = error.message ?? "";
	const sep = raw.indexOf(":");
	if (sep === -1) return FALLBACK;
	const code = raw.slice(0, sep);
	const message = raw.slice(sep + 1).trim();
	if (KNOWN_CODES.has(code as ChatErrorCode) && message) {
		return { code: code as ChatErrorCode, message };
	}
	return FALLBACK;
}
