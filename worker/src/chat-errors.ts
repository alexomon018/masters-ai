// User-facing chat error codes. The worker emits one of these as the stream's
// error text (via toUIMessageStreamResponse onError) or throws a ChatError
// before the stream starts; the client matches on the code to pick a banner.
// Keep the wire format dead simple: `${CODE}:${humanMessage}` so the SPA never
// needs to JSON-parse a half-streamed error.
export type ChatErrorCode =
	| "QUOTA_EXCEEDED"
	| "PROVIDER_UNAVAILABLE"
	| "UNKNOWN";

export class ChatError extends Error {
	code: ChatErrorCode;

	constructor(code: ChatErrorCode, message: string) {
		super(message);
		this.name = "ChatError";
		this.code = code;
	}
}

export function encodeChatError(code: ChatErrorCode, message: string): string {
	return `${code}:${message}`;
}

interface ApiCallErrorLike {
	statusCode?: number;
	responseBody?: string;
	message?: string;
}

function isApiCallErrorLike(err: unknown): err is ApiCallErrorLike {
	return (
		typeof err === "object" &&
		err !== null &&
		("statusCode" in err || "responseBody" in err)
	);
}

const CREDIT_MARKERS = [
	"credit balance",
	"insufficient",
	"billing",
	"quota",
	"payment"
];

// Maps any error raised during a chat turn to a user-safe code + message.
// Provider-side failures (out of credits, rate limit, bad key) are never
// disclosed in detail to the user — they all collapse to PROVIDER_UNAVAILABLE
// with a generic "temporarily unavailable" message. Details stay server-side.
export function classifyChatError(err: unknown): {
	code: ChatErrorCode;
	message: string;
} {
	if (err instanceof ChatError) {
		return { code: err.code, message: err.message };
	}

	if (isApiCallErrorLike(err)) {
		const status = err.statusCode;
		const body = (err.responseBody ?? err.message ?? "").toLowerCase();
		const looksLikeCredit = CREDIT_MARKERS.some((m) => body.includes(m));
		if (
			status === 401 ||
			status === 402 ||
			status === 429 ||
			(status === 400 && looksLikeCredit) ||
			looksLikeCredit
		) {
			return {
				code: "PROVIDER_UNAVAILABLE",
				message:
					"The assistant is temporarily unavailable. Please try again later."
			};
		}
	}

	return {
		code: "UNKNOWN",
		message: "Something went wrong generating a response. Please try again."
	};
}
