import { afterEach, describe, expect, it, vi } from "vitest";
import { getThreadGetMessagesUrl } from "./getThreadGetMessagesUrl";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("getThreadGetMessagesUrl", () => {
	it("returns null when NEXT_PUBLIC_WORKER_URL is unset", () => {
		vi.stubEnv("NEXT_PUBLIC_WORKER_URL", "");
		expect(getThreadGetMessagesUrl("t1")).toBeNull();
	});

	it("returns null for an empty threadId", () => {
		vi.stubEnv("NEXT_PUBLIC_WORKER_URL", "http://localhost:8787");
		expect(getThreadGetMessagesUrl("")).toBeNull();
	});

	it("uses http for a localhost host", () => {
		vi.stubEnv("NEXT_PUBLIC_WORKER_URL", "http://localhost:8787");
		const url = getThreadGetMessagesUrl("abc");
		expect(url?.toString()).toBe(
			"http://localhost:8787/agents/masters-chat-agent/abc/get-messages"
		);
	});

	it("uses http for a 127.0.0.1 host", () => {
		vi.stubEnv("NEXT_PUBLIC_WORKER_URL", "http://127.0.0.1:8787");
		const url = getThreadGetMessagesUrl("abc");
		expect(url?.protocol).toBe("http:");
	});

	it("uses https for a production host", () => {
		vi.stubEnv("NEXT_PUBLIC_WORKER_URL", "https://agent.femasters.guru");
		const url = getThreadGetMessagesUrl("abc");
		expect(url?.toString()).toBe(
			"https://agent.femasters.guru/agents/masters-chat-agent/abc/get-messages"
		);
	});

	it("rewrites a ws:// scheme and trims a trailing slash", () => {
		vi.stubEnv("NEXT_PUBLIC_WORKER_URL", "wss://agent.example.com/");
		const url = getThreadGetMessagesUrl("xyz");
		expect(url?.toString()).toBe(
			"https://agent.example.com/agents/masters-chat-agent/xyz/get-messages"
		);
	});
});
