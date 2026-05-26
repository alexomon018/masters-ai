import type { ReactNode } from "react";
import type { UIMessage } from "ai";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import { ModelStoreProvider } from "@/providers";
import { server } from "../../../test/msw/server";
import { makeTestQueryClient } from "../../../test/utils/renderWithProviders";

const WORKER = "http://localhost:8787";

const sendMessage = vi.fn();
const stop = vi.fn();
const agentChatState: {
	messages: UIMessage[];
	status: string;
	lastOptions: Record<string, unknown> | null;
} = { messages: [], status: "ready", lastOptions: null };

vi.mock("agents/react", () => ({
	useAgent: vi.fn(() => ({ id: "agent-stub" }))
}));

vi.mock("@cloudflare/ai-chat/react", () => ({
	useAgentChat: vi.fn((options: Record<string, unknown>) => {
		agentChatState.lastOptions = options;
		return {
			messages: agentChatState.messages,
			sendMessage,
			status: agentChatState.status,
			stop
		};
	})
}));

vi.mock("@clerk/nextjs", () => ({
	useAuth: () => ({ getToken: vi.fn(async () => null) }),
	useUser: () => ({ user: null })
}));

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

vi.mock("./hooks", () => ({
	useAutoNameThread: vi.fn(),
	useQuotaInvalidation: vi.fn()
}));

import useChat from "./useChat";

function wrapper({ children }: { children: ReactNode }) {
	const queryClient = makeTestQueryClient();
	return (
		<QueryClientProvider client={queryClient}>
			<ModelStoreProvider>{children}</ModelStoreProvider>
		</QueryClientProvider>
	);
}

const renderChat = (threadId: string, isNewThread: boolean) =>
	renderHook(() => useChat({ threadId, isNewThread }), { wrapper });

beforeEach(() => {
	sendMessage.mockClear();
	stop.mockClear();
	upsertThreadRemote.mockClear();
	agentChatState.messages = [];
	agentChatState.status = "ready";
	agentChatState.lastOptions = null;
});

describe("useChat — initial messages", () => {
	it("passes a null getInitialMessages for a new thread (skips the fetch)", () => {
		renderChat("new-thread", true);
		expect(agentChatState.lastOptions?.getInitialMessages).toBeNull();
	});

	it("fetches initial messages with the auth query for an existing thread", async () => {
		const getMessages = vi.fn(() =>
			HttpResponse.json([
				{ id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] }
			])
		);
		server.use(
			http.get(
				`${WORKER}/agents/masters-chat-agent/:threadId/get-messages`,
				getMessages
			)
		);

		renderChat("existing-thread", false);
		const fn = agentChatState.lastOptions?.getInitialMessages as () => Promise<
			UIMessage[]
		>;
		expect(typeof fn).toBe("function");
		const result = await fn();
		expect(getMessages).toHaveBeenCalled();
		expect(result).toHaveLength(1);
	});

	it("returns [] when the get-messages response is not ok", async () => {
		server.use(
			http.get(
				`${WORKER}/agents/masters-chat-agent/:threadId/get-messages`,
				() => HttpResponse.json({}, { status: 500 })
			)
		);
		renderChat("existing-thread", false);
		const fn = agentChatState.lastOptions?.getInitialMessages as () => Promise<
			UIMessage[]
		>;
		await expect(fn()).resolves.toEqual([]);
	});

	it("returns [] when the response body is not valid JSON", async () => {
		server.use(
			http.get(
				`${WORKER}/agents/masters-chat-agent/:threadId/get-messages`,
				() => new HttpResponse("not json", { status: 200 })
			)
		);
		renderChat("existing-thread", false);
		const fn = agentChatState.lastOptions?.getInitialMessages as () => Promise<
			UIMessage[]
		>;
		await expect(fn()).resolves.toEqual([]);
	});
});

describe("useChat — sending the first message", () => {
	it("upserts the thread, swaps the URL, and sends on the first submit", async () => {
		const replaceState = vi.spyOn(window.history, "replaceState");
		const { result } = renderChat("first-thread", true);

		act(() => {
			result.current.submitMessage("Hello there");
		});

		expect(sendMessage).toHaveBeenCalledWith({
			role: "user",
			parts: [{ type: "text", text: "Hello there" }]
		});
		expect(upsertThreadRemote).toHaveBeenCalledTimes(1);
		const [, payload] = upsertThreadRemote.mock.calls[0];
		expect(payload).toMatchObject({
			threadId: "first-thread",
			title: "New Chat",
			pinned: false
		});
		expect(replaceState).toHaveBeenCalledWith(null, "", "/chat/first-thread");
		replaceState.mockRestore();
	});

	it("does not re-upsert or replace the URL on the second submit", () => {
		const replaceState = vi.spyOn(window.history, "replaceState");
		const { result } = renderChat("first-thread-2", true);

		act(() => result.current.submitMessage("first"));
		upsertThreadRemote.mockClear();
		replaceState.mockClear();
		act(() => result.current.submitMessage("second"));

		expect(upsertThreadRemote).not.toHaveBeenCalled();
		expect(replaceState).not.toHaveBeenCalled();
		expect(sendMessage).toHaveBeenCalledTimes(2);
		replaceState.mockRestore();
	});

	it("does not upsert on an existing (non-new) thread", () => {
		const { result } = renderChat("existing", false);
		act(() => result.current.submitMessage("hi"));
		expect(upsertThreadRemote).not.toHaveBeenCalled();
		expect(sendMessage).toHaveBeenCalledTimes(1);
	});
});

describe("useChat — input handling", () => {
	it("no-ops on empty / whitespace-only input", () => {
		const { result } = renderChat("t", false);
		act(() => result.current.submitMessage("   "));
		expect(sendMessage).not.toHaveBeenCalled();
	});

	it("clears the input after a submit", () => {
		const { result } = renderChat("t", false);
		act(() => result.current.setInput("typed"));
		expect(result.current.input).toBe("typed");
		act(() => result.current.submitMessage("typed"));
		expect(result.current.input).toBe("");
	});

	it("handleSubmit prevents default and forwards the current input", () => {
		const { result } = renderChat("t", false);
		act(() => result.current.setInput("from form"));
		const preventDefault = vi.fn();
		act(() => {
			result.current.handleSubmit({
				preventDefault
			} as unknown as React.FormEvent<HTMLFormElement>);
		});
		expect(preventDefault).toHaveBeenCalled();
		expect(sendMessage).toHaveBeenCalledWith({
			role: "user",
			parts: [{ type: "text", text: "from form" }]
		});
	});
});

describe("useChat — derived state", () => {
	it("isEmpty is true with no messages and false otherwise", () => {
		const { result, rerender } = renderChat("t", false);
		expect(result.current.isEmpty).toBe(true);

		agentChatState.messages = [
			{ id: "a", role: "user", parts: [{ type: "text", text: "x" }] } as UIMessage
		];
		rerender();
		expect(result.current.isEmpty).toBe(false);
	});

	it("loading is true while streaming with no assistant content yet", () => {
		agentChatState.status = "streaming";
		agentChatState.messages = [
			{ id: "u", role: "user", parts: [{ type: "text", text: "q" }] } as UIMessage
		];
		const { result } = renderChat("t", false);
		expect(result.current.streaming).toBe(true);
		expect(result.current.loading).toBe(true);
	});

	it("loading is false once an assistant message has parts", () => {
		agentChatState.status = "streaming";
		agentChatState.messages = [
			{ id: "u", role: "user", parts: [{ type: "text", text: "q" }] } as UIMessage,
			{
				id: "a",
				role: "assistant",
				parts: [{ type: "text", text: "answer" }]
			} as UIMessage
		];
		const { result } = renderChat("t", false);
		expect(result.current.loading).toBe(false);
	});
});
