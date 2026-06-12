import type { ReactNode } from "react";
import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@constants";
import { makeTestQueryClient } from "../test/utils/renderWithProviders";

const { fetchThreadMessages } = vi.hoisted(() => ({
	fetchThreadMessages: vi.fn<
		(
			tokenFn: () => Promise<string | null>,
			threadId: string
		) => Promise<UIMessage[]>
	>(async () => [])
}));
vi.mock("@/components/organisms/Chat/helpers", async (importOriginal) => ({
	...(await importOriginal<object>()),
	fetchThreadMessages
}));

vi.mock("@clerk/clerk-react", () => ({
	useAuth: () => ({ getToken: vi.fn(async () => null) })
}));

import useThreadMessagesSync from "./useThreadMessagesSync";

const THREAD_ID = "11111111-1111-4111-8111-111111111111";

const userMsg = (id: string, text: string): UIMessage =>
	({ id, role: "user", parts: [{ type: "text", text }] }) as UIMessage;
const assistantMsg = (id: string, text: string): UIMessage =>
	({ id, role: "assistant", parts: [{ type: "text", text }] }) as UIMessage;

const normalTurn = [userMsg("u1", "question"), assistantMsg("a1", "answer")];
const splitTurn = [
	userMsg("u1", "question"),
	assistantMsg("a1", "first half"),
	assistantMsg("a2", "second half")
];
const mergedTurn = [
	userMsg("u1", "question"),
	assistantMsg("a1", "first half second half")
];
const truncatedTurn = [
	userMsg("u1", "question"),
	assistantMsg("a1", "first half")
];

function setup() {
	const queryClient = makeTestQueryClient();
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const setMessages: (messages: UIMessage[]) => void = vi.fn();
	const render = (agentMessages: UIMessage[], isStreaming: boolean) =>
		renderHook((props) => useThreadMessagesSync(props), {
			wrapper,
			initialProps: {
				threadId: THREAD_ID,
				agentMessages,
				isStreaming,
				setMessages
			}
		});
	return { queryClient, setMessages, render };
}

const rerenderProps = (
	setMessages: (messages: UIMessage[]) => void,
	agentMessages: UIMessage[],
	isStreaming: boolean
) => ({
	threadId: THREAD_ID,
	agentMessages,
	isStreaming,
	setMessages
});

const flush = () =>
	new Promise((resolve) => {
		setTimeout(resolve, 0);
	});

beforeEach(() => {
	fetchThreadMessages.mockClear();
	fetchThreadMessages.mockResolvedValue([]);
});

describe("write-through cache", () => {
	it("writes the message list into the thread cache when idle", () => {
		const { queryClient, render } = setup();
		render(normalTurn, false);
		expect(
			queryClient.getQueryData(queryKeys.threadMessages(THREAD_ID))
		).toEqual(normalTurn);
	});

	it("does not write while streaming", () => {
		const { queryClient, render } = setup();
		render(normalTurn, true);
		expect(
			queryClient.getQueryData(queryKeys.threadMessages(THREAD_ID))
		).toBeUndefined();
	});

	it("does not write an empty list", () => {
		const { queryClient, render } = setup();
		render([], false);
		expect(
			queryClient.getQueryData(queryKeys.threadMessages(THREAD_ID))
		).toBeUndefined();
	});
});

describe("mid-stream unmount", () => {
	it("drops the thread cache when unmounting while streaming", () => {
		const { queryClient, setMessages, render } = setup();
		queryClient.setQueryData(queryKeys.threadMessages(THREAD_ID), normalTurn);
		const { rerender, unmount } = render(normalTurn, false);
		rerender(rerenderProps(setMessages, normalTurn, true));
		unmount();
		expect(
			queryClient.getQueryData(queryKeys.threadMessages(THREAD_ID))
		).toBeUndefined();
	});

	it("keeps the thread cache when unmounting while idle", () => {
		const { queryClient, render } = setup();
		const { unmount } = render(normalTurn, false);
		unmount();
		expect(
			queryClient.getQueryData(queryKeys.threadMessages(THREAD_ID))
		).toEqual(normalTurn);
	});
});

describe("end-of-turn reconciliation", () => {
	it("replaces a split turn with the server's merged history", async () => {
		fetchThreadMessages.mockResolvedValue(mergedTurn);
		const { setMessages, render } = setup();
		const { rerender } = render([userMsg("u1", "question")], true);
		rerender(rerenderProps(setMessages, splitTurn, false));
		await waitFor(() => {
			expect(setMessages).toHaveBeenCalledWith(mergedTurn);
		});
		expect(fetchThreadMessages).toHaveBeenCalledTimes(1);
	});

	it("replaces a truncated turn with the server's longer history", async () => {
		fetchThreadMessages.mockResolvedValue(mergedTurn);
		const { setMessages, render } = setup();
		const { rerender } = render([userMsg("u1", "question")], true);
		rerender(rerenderProps(setMessages, truncatedTurn, false));
		await waitFor(() => {
			expect(setMessages).toHaveBeenCalledWith(mergedTurn);
		});
		expect(fetchThreadMessages).toHaveBeenCalledTimes(1);
	});

	it("fetches but does not apply when the server matches the client", async () => {
		fetchThreadMessages.mockResolvedValue(normalTurn);
		const { setMessages, render } = setup();
		const { rerender } = render([userMsg("u1", "question")], true);
		rerender(rerenderProps(setMessages, normalTurn, false));
		await waitFor(() => {
			expect(fetchThreadMessages).toHaveBeenCalledTimes(1);
		});
		await flush();
		expect(setMessages).not.toHaveBeenCalled();
	});

	it("does not reconcile without a streaming → idle transition", async () => {
		const { setMessages, render } = setup();
		render(splitTurn, false);
		await flush();
		expect(fetchThreadMessages).not.toHaveBeenCalled();
	});

	it("ignores a server list with less text than the client view", async () => {
		fetchThreadMessages.mockResolvedValue([
			userMsg("u1", "question"),
			assistantMsg("a1", "first half")
		]);
		const { setMessages, render } = setup();
		const { rerender } = render([userMsg("u1", "question")], true);
		rerender(rerenderProps(setMessages, splitTurn, false));
		await waitFor(() => {
			expect(fetchThreadMessages).toHaveBeenCalledTimes(1);
		});
		await flush();
		expect(setMessages).not.toHaveBeenCalled();
	});

	it("aborts when the user sent another message before the fetch resolved", async () => {
		let resolveFetch: (messages: UIMessage[]) => void = () => {};
		fetchThreadMessages.mockImplementation(
			() =>
				new Promise<UIMessage[]>((resolve) => {
					resolveFetch = resolve;
				})
		);
		const { setMessages, render } = setup();
		const { rerender } = render([userMsg("u1", "question")], true);
		rerender(rerenderProps(setMessages, splitTurn, false));
		await waitFor(() => {
			expect(fetchThreadMessages).toHaveBeenCalledTimes(1);
		});
		rerender(
			rerenderProps(
				setMessages,
				[...splitTurn, userMsg("u2", "another question")],
				true
			)
		);
		resolveFetch(mergedTurn);
		await flush();
		expect(setMessages).not.toHaveBeenCalled();
	});
});
