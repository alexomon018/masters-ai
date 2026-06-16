import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../../test/msw/server";
import {
	deleteFeedbackRemote,
	fetchThreadFeedback,
	sendFeedbackRemote
} from "./feedback";

const WORKER = "http://localhost:8787";
const getToken = async () => null;

beforeEach(() => {
	// A stored anon id keeps buildAuthQueryParams from trying to mint one
	// (which would be an unhandled /anon-id request under MSW's error mode).
	localStorage.setItem("masters_anon_id", "anon.sig");
});

afterEach(() => {
	localStorage.clear();
});

describe("sendFeedbackRemote", () => {
	it("POSTs the feedback body and resolves true on ok", async () => {
		let received: unknown;
		server.use(
			http.post(`${WORKER}/feedback`, async ({ request }) => {
				received = await request.json();
				return HttpResponse.json({ ok: true });
			})
		);

		const ok = await sendFeedbackRemote(getToken, {
			threadId: "thread-1",
			messageId: "msg-1",
			sentiment: "down",
			reason: "Not accurate",
			comment: "wrong"
		});

		expect(ok).toBe(true);
		expect(received).toEqual({
			threadId: "thread-1",
			messageId: "msg-1",
			sentiment: "down",
			reason: "Not accurate",
			comment: "wrong"
		});
	});

	it("resolves false on a non-ok response", async () => {
		server.use(
			http.post(`${WORKER}/feedback`, () =>
				HttpResponse.json({}, { status: 403 })
			)
		);
		await expect(
			sendFeedbackRemote(getToken, {
				threadId: "thread-1",
				messageId: "msg-1",
				sentiment: "up"
			})
		).resolves.toBe(false);
	});

	it("resolves false when the request throws (network error)", async () => {
		server.use(http.post(`${WORKER}/feedback`, () => HttpResponse.error()));
		await expect(
			sendFeedbackRemote(getToken, {
				threadId: "thread-1",
				messageId: "msg-1",
				sentiment: "up"
			})
		).resolves.toBe(false);
	});
});

describe("deleteFeedbackRemote", () => {
	it("DELETEs and resolves true on ok", async () => {
		server.use(
			http.delete(`${WORKER}/feedback`, () => HttpResponse.json({ ok: true }))
		);
		await expect(
			deleteFeedbackRemote(getToken, {
				threadId: "thread-1",
				messageId: "msg-1"
			})
		).resolves.toBe(true);
	});
});

describe("fetchThreadFeedback", () => {
	it("maps rows by messageId", async () => {
		server.use(
			http.get(`${WORKER}/feedback`, () =>
				HttpResponse.json([
					{
						messageId: "msg-1",
						sentiment: "up",
						reason: null,
						comment: null
					},
					{
						messageId: "msg-2",
						sentiment: "down",
						reason: "Off topic",
						comment: "nope"
					}
				])
			)
		);

		const map = await fetchThreadFeedback(getToken, "thread-1");

		expect(map).toEqual({
			"msg-1": { sentiment: "up", reason: null, comment: null },
			"msg-2": { sentiment: "down", reason: "Off topic", comment: "nope" }
		});
	});

	it("returns an empty map on a non-ok response", async () => {
		server.use(
			http.get(`${WORKER}/feedback`, () =>
				HttpResponse.json({}, { status: 500 })
			)
		);
		await expect(fetchThreadFeedback(getToken, "thread-1")).resolves.toEqual(
			{}
		);
	});

	it("returns an empty map when the body is not an array", async () => {
		server.use(
			http.get(`${WORKER}/feedback`, () =>
				HttpResponse.json({ unexpected: "shape" })
			)
		);
		await expect(fetchThreadFeedback(getToken, "thread-1")).resolves.toEqual(
			{}
		);
	});
});
