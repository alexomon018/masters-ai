import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../../test/msw/server";
import {
	buildAuthQueryParams,
	fetchWorkerTicket,
	getAnonId,
	readStoredAnonId,
	resolveAgentAuth
} from "./agentAuth";

const WORKER = "http://localhost:8787";

afterEach(() => {
	localStorage.clear();
	vi.unstubAllEnvs();
});

describe("getAnonId", () => {
	it("returns the stored anon id without hitting the worker", async () => {
		localStorage.setItem("masters_anon_id", "stored.sig");
		await expect(getAnonId()).resolves.toBe("stored.sig");
		expect(readStoredAnonId()).toBe("stored.sig");
	});

	it("mints a fresh anon id from the worker and persists it", async () => {
		server.use(
			http.get(`${WORKER}/anon-id`, () =>
				HttpResponse.json({ anonId: "minted.sig" })
			)
		);
		await expect(getAnonId()).resolves.toBe("minted.sig");
		expect(localStorage.getItem("masters_anon_id")).toBe("minted.sig");
	});

	it("returns empty string when the worker URL is unset", async () => {
		vi.stubEnv("VITE_WORKER_URL", "");
		await expect(getAnonId()).resolves.toBe("");
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
		server.use(http.post(`${WORKER}/ws-ticket`, () => HttpResponse.error()));
		await expect(fetchWorkerTicket("jwt")).resolves.toBeNull();
	});

	it("returns null when VITE_WORKER_URL is unset", async () => {
		vi.stubEnv("VITE_WORKER_URL", "");
		await expect(fetchWorkerTicket("jwt")).resolves.toBeNull();
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

	it("falls back to the stored anon id when there is no token", async () => {
		localStorage.setItem("masters_anon_id", "anon.sig");
		const auth = await resolveAgentAuth(async () => null);
		expect(auth).toEqual({ anonId: "anon.sig" });
	});

	it("returns empty when there is neither token nor a mintable anon id", async () => {
		server.use(http.get(`${WORKER}/anon-id`, () => HttpResponse.error()));
		const auth = await resolveAgentAuth(async () => null);
		expect(auth).toEqual({});
	});
});

describe("buildAuthQueryParams", () => {
	it("serialises the auth claims into URLSearchParams", async () => {
		localStorage.setItem("masters_anon_id", "anon.sig");
		const params = await buildAuthQueryParams(async () => null);
		expect(params.get("anonId")).toBe("anon.sig");
		expect(params.toString()).toBe("anonId=anon.sig");
	});
});
