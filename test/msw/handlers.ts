import { http, HttpResponse } from "msw";

const WORKER = "http://localhost:8787";

export const handlers = [
	http.post(`${WORKER}/ws-ticket`, () =>
		HttpResponse.json({ ticket: "test-ticket-123" })
	),

	http.get(`${WORKER}/threads`, () => HttpResponse.json([])),
	http.post(`${WORKER}/threads`, () => HttpResponse.json({ ok: true })),

	http.get(
		`${WORKER}/agents/masters-chat-agent/:threadId/get-messages`,
		() => HttpResponse.json([])
	),

	http.post("/api/name-thread", () => HttpResponse.json("A Test Title")),

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
