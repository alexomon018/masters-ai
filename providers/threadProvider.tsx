"use client";

import {
	createContext,
	useContext,
	ReactNode,
	useState,
	useEffect
} from "react";
import { DEX_Message, DEX_Thread, dxdb } from "@/localdb/dexie";
import { usePathname } from "next/navigation";

interface ThreadContextType {
	threads: DEX_Thread[];
	messages: Record<string, DEX_Message[]>;
	activeThreadId: string | null;
	createThread: (
		title: string,
		id: string,
		projectId?: string
	) => Promise<string>;
	setActiveThreadId: (id: string) => void;
	addMessageToThread: (
		content: string,
		role: "user" | "assistant",
		threadId: string
	) => Promise<string>;
	updateThread: (id: string, updates: Partial<DEX_Thread>) => Promise<void>;

	deleteThread: (id: string) => Promise<void>;
}

const ThreadContext = createContext<ThreadContextType | null>(null);

export function ThreadProvider({ children }: { children: ReactNode }) {
	const [threads, setThreads] = useState<DEX_Thread[]>([]);
	const [messages, setMessages] = useState<Record<string, DEX_Message[]>>({});
	const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
	const pathname = usePathname();

	useEffect(() => {
		const loadThreads = async () => {
			const threadsData = await dxdb.threads
				.orderBy("last_message_at")
				.reverse()
				.toArray();

			setThreads(threadsData);
		};
		loadThreads();
	}, []);

	// Add new useEffect for URL monitoring using Next.js features
	useEffect(() => {
		const match = pathname.match(/\/chat\/([^\/]+)/);
		if (match && match[1]) {
			const threadId = match[1];
			setActiveThreadId(threadId);
		}
	}, [pathname]); // React to pathname changes

	const threadState: ThreadContextType = {
		threads,
		messages,
		activeThreadId,

		async createThread(title: string, id: string, projectId?: string) {
			const newThread = {
				title: title || "New Chat",
				id: id,
				projectId: projectId
			};

			await dxdb.createThread(newThread);
			const createdThread = await dxdb.threads.get(id);
			if (createdThread) {
				setThreads((prev) => [createdThread, ...prev]);
				setActiveThreadId(id);
			}
			return id;
		},

		async addMessageToThread(
			content: string,
			role: "user" | "assistant",
			threadId: string
		) {
			const messageId = await dxdb.addMessage({ content, role, threadId });
			const updatedMessages = await dxdb.getThreadMessages(threadId);
			setMessages((prev) => ({
				...prev,
				[threadId]: updatedMessages
			}));
			return messageId;
		},

		async updateThread(id: string, updates: Partial<DEX_Thread>) {
			console.log("updates", updates);
			await dxdb.updateThread(id, updates);
			const updatedThread = await dxdb.threads.get(id);
			console.log("updatedThread", updatedThread);

			if (updatedThread) {
				setThreads((prev) =>
					prev.map((t) => (t.id === id ? updatedThread : t))
				);
			}
		},

		async deleteThread(id: string) {
			await dxdb.deleteThread(id);
			setThreads((prev) => prev.filter((t) => t.id !== id));
			setMessages((prev) => {
				const newMessages = { ...prev };
				delete newMessages[id];
				return newMessages;
			});
			if (activeThreadId === id) {
				setActiveThreadId(null);
			}
		},

		setActiveThreadId: (id: string) => {
			if (id) {
				setActiveThreadId(id);
			} else {
				console.warn("Attempted to set activeThreadId to null or undefined");
			}
		}
	};

	return (
		<ThreadContext.Provider value={threadState}>
			{children}
		</ThreadContext.Provider>
	);
}

export function useThread() {
	const context = useContext(ThreadContext);
	if (!context) {
		throw new Error("useThread must be used within a ThreadProvider");
	}
	return context;
}
