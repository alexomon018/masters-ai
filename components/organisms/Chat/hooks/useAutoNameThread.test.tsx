import type { ReactNode } from "react";
import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeTestQueryClient } from "../../../../test/utils/renderWithProviders";

const { autoNameThread, fetchThreads } = vi.hoisted(() => ({
	autoNameThread: vi.fn<
		(input: {
			threadId: string;
			userMessage: string;
			assistantMessage: string;
			modelId: string;
		}) => Promise<void>
	>(async () => {}),
	fetchThreads: vi.fn<
		(getToken: () => Promise<string | null>) => Promise<
			{ id: string; title: string }[]
		>
	>(async () => [])
}));
vi.mock("../helpers", () => ({ autoNameThread }));
vi.mock("@/components/organisms/SideBar/threadsApi", () => ({ fetchThreads }));

vi.mock("@clerk/clerk-react", () => ({
	useAuth: () => ({ getToken: vi.fn(async () => null) })
}));

import useAutoNameThread from "./useAutoNameThread";

const userMsg = (id: string, text: string): UIMessage =>
	({ id, role: "user", parts: [{ type: "text", text }] }) as UIMessage;
const assistantMsg = (id: string, text: string): UIMessage =>
	({ id, role: "assistant", parts: [{ type: "text", text }] }) as UIMessage;

function setup() {
	const queryClient = makeTestQueryClient();
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return { wrapper };
}

const renderHookFor = (
	threadId: string,
	agentMessages: UIMessage[],
	isStreaming: boolean
) => {
	const { wrapper } = setup();
	return renderHook(
		(props) => useAutoNameThread(props),
		{
			wrapper,
			initialProps: {
				activeThreadId: threadId,
				agentMessages,
				isStreaming,
				modelId: "claude-haiku-4-5"
			}
		}
	);
};

beforeEach(() => {
	autoNameThread.mockClear();
	fetchThreads.mockClear();
	fetchThreads.mockResolvedValue([]);
});

describe("useAutoNameThread", () => {
	it("fires once when a turn finishes with a user+assistant pair", async () => {
		const messages = [userMsg("u1", "What is RSC?"), assistantMsg("a1", "RSC…")];
		renderHookFor("thread-fires", messages, false);

		await waitFor(() => expect(autoNameThread).toHaveBeenCalledTimes(1));
		expect(autoNameThread).toHaveBeenCalledWith({
			threadId: "thread-fires",
			userMessage: "What is RSC?",
			assistantMessage: "RSC…",
			modelId: "claude-haiku-4-5"
		});
	});

	it("does not fire while streaming", async () => {
		const messages = [userMsg("u1", "Q"), assistantMsg("a1", "A")];
		renderHookFor("thread-streaming", messages, true);
		await new Promise((r) => setTimeout(r, 20));
		expect(autoNameThread).not.toHaveBeenCalled();
	});

	it("does not fire when there is no assistant text yet", async () => {
		const messages = [userMsg("u1", "Q"), assistantMsg("a1", "")];
		renderHookFor("thread-no-assistant", messages, false);
		await new Promise((r) => setTimeout(r, 20));
		expect(autoNameThread).not.toHaveBeenCalled();
	});

	it("does not re-fire for the same assistant message (per-thread guard)", async () => {
		const messages = [userMsg("u1", "Q"), assistantMsg("same-a", "A")];
		const { rerender } = renderHookFor("thread-guard", messages, false);
		await waitFor(() => expect(autoNameThread).toHaveBeenCalledTimes(1));

		rerender({
			activeThreadId: "thread-guard",
			agentMessages: messages,
			isStreaming: false,
			modelId: "claude-haiku-4-5"
		});
		await new Promise((r) => setTimeout(r, 20));
		expect(autoNameThread).toHaveBeenCalledTimes(1);
	});

	it("skips when the thread already has a non-default title", async () => {
		fetchThreads.mockResolvedValue([
			{ id: "thread-titled", title: "React Server Components" }
		]);
		const messages = [userMsg("u1", "Q"), assistantMsg("a1", "A")];
		renderHookFor("thread-titled", messages, false);
		await new Promise((r) => setTimeout(r, 30));
		expect(autoNameThread).not.toHaveBeenCalled();
	});
});
