import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../../test/msw/server";
import {
	buildAuthQueryParams,
	fetchWorkerTicket,
	readAnonCookie,
	resolveAgentAuth
} from "./agentAuth";

const WORKER = "http://localhost:8787";

afterEach(() => {
	// Clear any cookie a test set.
	document.cookie =
		"masters_anon_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

describe("readAnonCookie", () => {
	it("returns the signed anon id from document.cookie", () => {
		document.cookie = "masters_anon_id=abc.def; path=/";
		expect(readAnonCookie()).toBe("abc.def");
	});

	it("returns empty string when the cookie is absent", () => {
		expect(readAnonCookie()).toBe("");
	});
});

describe("fetchWorkerTicket", () => {
	it("returns the ticket on a 200 response", async () => {
		server.use(
			http.post(`${WORKER}/ws-ticket`, () =>
				HttpResponse.json({ ticket: "tkt-1" })
			)
		);
		await expect(fetchWorkerTicket("jwt")).resolves.toBe("tkt-1");
	});

	it("returns null on a non-2xx response", async () => {
		server.use(
			http.post(`${WORKER}/ws-ticket`, () =>
				HttpResponse.json({}, { status: 401 })
			)
		);
		await expect(fetchWorkerTicket("jwt")).resolves.toBeNull();
	});

	it("returns null when the worker errors / network throws", async () => {
		server.use(
			http.post(`${WORKER}/ws-ticket`, () => HttpResponse.error())
		);
		await expect(fetchWorkerTicket("jwt")).resolves.toBeNull();
	});

	it("returns null when NEXT_PUBLIC_WORKER_URL is unset", async () => {
		vi.stubEnv("NEXT_PUBLIC_WORKER_URL", "");
		await expect(fetchWorkerTicket("jwt")).resolves.toBeNull();
		vi.unstubAllEnvs();
	});
});

describe("resolveAgentAuth", () => {
	it("exchanges a token for a ticket when one is available", async () => {
		server.use(
			http.post(`${WORKER}/ws-ticket`, () =>
				HttpResponse.json({ ticket: "tkt-2" })
			)
		);
		const auth = await resolveAgentAuth(async () => "jwt-token");
		expect(auth).toEqual({ ticket: "tkt-2" });
	});

	it("returns an empty object when the ticket fetch fails", async () => {
		server.use(
			http.post(`${WORKER}/ws-ticket`, () =>
				HttpResponse.json({}, { status: 500 })
			)
		);
		const auth = await resolveAgentAuth(async () => "jwt-token");
		expect(auth).toEqual({});
	});

	it("falls back to the anon cookie when there is no token", async () => {
		document.cookie = "masters_anon_id=anon.sig; path=/";
		const auth = await resolveAgentAuth(async () => null);
		expect(auth).toEqual({ anonId: "anon.sig" });
	});

	it("returns empty when there is neither token nor cookie", async () => {
		const auth = await resolveAgentAuth(async () => null);
		expect(auth).toEqual({});
	});
});

describe("buildAuthQueryParams", () => {
	it("serialises the auth claims into URLSearchParams", async () => {
		document.cookie = "masters_anon_id=anon.sig; path=/";
		const params = await buildAuthQueryParams(async () => null);
		expect(params.get("anonId")).toBe("anon.sig");
		expect(params.toString()).toBe("anonId=anon.sig");
	});
});
