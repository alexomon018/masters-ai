import { http, HttpResponse } from "msw";

// Default happy-path handlers for the worker + Next.js endpoints the chat
// feature talks to. Individual tests override these with `server.use(...)`
// to exercise error / edge cases.
//
// NEXT_PUBLIC_WORKER_URL is stubbed to http://localhost:8787 in setup.unit.ts.
const WORKER = "http://localhost:8787";

export const handlers = [
	// Exchange a Clerk JWT for a single-use WS ticket.
	http.post(`${WORKER}/ws-ticket`, () =>
		HttpResponse.json({ ticket: "test-ticket-123" })
	),

	// Thread index.
	http.get(`${WORKER}/threads`, () => HttpResponse.json([])),
	http.post(`${WORKER}/threads`, () => HttpResponse.json({ ok: true })),

	// Initial message history for a thread room.
	http.get(
		`${WORKER}/agents/masters-chat-agent/:threadId/get-messages`,
		() => HttpResponse.json([])
	),

	// Next.js thread-naming route. The route returns NextResponse.json(title),
	// i.e. a JSON-encoded string, which the caller parses with response.json().
	http.post("/api/name-thread", () => HttpResponse.json("A Test Title")),

	// Message-quota lookup (rendered by MessageLimit inside ChatForm).
	http.get("/api/user-info", () =>
		HttpResponse.json({
			userId: "anonymous",
			used: 0,
			remaining: 10,
			total: 10,
			resetsAt: "never"
		})
	)
];
