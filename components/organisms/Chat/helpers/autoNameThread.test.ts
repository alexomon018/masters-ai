import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../../test/msw/server";
import autoNameThread from "./autoNameThread";

const WORKER = "http://localhost:8787";

const { upsertThreadRemote } = vi.hoisted(() => ({
	upsertThreadRemote: vi.fn<
		(
			getToken: () => Promise<string | null>,
			input: {
				threadId: string;
				title?: string | null;
				pinned?: boolean;
				lastMessageAt?: number;
			}
		) => Promise<void>
	>(async () => {})
}));
vi.mock("@/components/organisms/SideBar/threadsApi", () => ({
	upsertThreadRemote
}));

const baseInput = {
	threadId: "thread-1",
	userMessage: "What is RSC?",
	assistantMessage: "React Server Components…",
	modelId: "claude-haiku-4-5"
};

beforeEach(() => {
	// A stored anon id keeps buildAuthQueryParams from trying to mint one
	// (which would be an unhandled /anon-id request under MSW's error mode).
	localStorage.setItem("masters_anon_id", "anon.sig");
});

afterEach(() => {
	upsertThreadRemote.mockClear();
	localStorage.clear();
	delete (window as unknown as { Clerk?: unknown }).Clerk;
});

describe("autoNameThread", () => {
	it("posts the exchange to the worker and upserts the returned title", async () => {
		server.use(
			http.post(`${WORKER}/name-thread`, () =>
				HttpResponse.json({ title: "React Server Components" })
			)
		);

		await autoNameThread(baseInput);

		expect(upsertThreadRemote).toHaveBeenCalledTimes(1);
		const [, payload] = upsertThreadRemote.mock.calls[0];
		expect(payload).toEqual({
			threadId: "thread-1",
			title: "React Server Components"
		});
	});

	it("does not upsert when /name-thread returns non-ok", async () => {
		server.use(
			http.post(`${WORKER}/name-thread`, () =>
				HttpResponse.json({}, { status: 429 })
			)
		);
		await autoNameThread(baseInput);
		expect(upsertThreadRemote).not.toHaveBeenCalled();
	});

	it("reads the Clerk token off window when present", async () => {
		const getToken = vi.fn(async () => "clerk-jwt");
		(window as unknown as { Clerk: unknown }).Clerk = {
			session: { getToken }
		};
		server.use(
			http.post(`${WORKER}/ws-ticket`, () =>
				HttpResponse.json({ ticket: "tkt" })
			),
			http.post(`${WORKER}/name-thread`, () =>
				HttpResponse.json({ title: "A Title" })
			)
		);

		await autoNameThread(baseInput);

		const [tokenFn] = upsertThreadRemote.mock.calls[0]!;
		await expect(tokenFn()).resolves.toBe("clerk-jwt");
		expect(getToken).toHaveBeenCalled();
	});

	it("tolerates a title that is not a string", async () => {
		server.use(
			http.post(`${WORKER}/name-thread`, () =>
				HttpResponse.json({ title: 123 })
			)
		);
		await autoNameThread(baseInput);
		expect(upsertThreadRemote).not.toHaveBeenCalled();
	});
});
