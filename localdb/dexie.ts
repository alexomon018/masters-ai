/* eslint-disable @typescript-eslint/naming-convention */
import { Dexie, type Table } from "dexie";

export interface DEX_Project {
	id: string;
	name: string;
	description: string;
	created_at: Date;
	updated_at: Date;
}

export interface DEX_Thread {
	id: string;
	title: string;
	projectId?: string; // Optional project association
	created_at: Date;
	updated_at: Date;
	last_message_at: Date;
	isPinned: boolean;
}

export interface DEX_Message {
	id: string;
	content: string;
	role: "user" | "assistant";
	threadId: string;
	created_at: Date;
}

class ChatDB extends Dexie {
	projects!: Table<DEX_Project>;
	threads!: Table<DEX_Thread>;
	messages!: Table<DEX_Message>;

	constructor() {
		super("chatdb");

		this.version(2).stores({
			projects: "id, name, created_at, updated_at",
			threads:
				"id, projectId, created_at, updated_at, last_message_at, isPinned",
			messages: "id, threadId, created_at, [threadId+created_at]"
		});
	}

	async getProjectThreads(projectId: string) {
		return this.threads
			.where("projectId")
			.equals(projectId)
			.reverse()
			.sortBy("last_message_at");
	}

	async getThreadMessages(threadId: string) {
		return this.messages
			.where("threadId")
			.equals(threadId)
			.sortBy("created_at");
	}

	async getAllThreadsWithProjects() {
		const threads = await this.threads.toArray();
		const projectIds = threads
			.map((t) => t.projectId)
			.filter((id): id is string => id !== undefined);

		const projects = await this.projects
			.where("id")
			.anyOf(projectIds)
			.toArray();

		const projectMap = new Map(projects.map((p) => [p.id, p]));

		return threads.map((t) => ({
			...t,
			project: t.projectId ? projectMap.get(t.projectId) : undefined
		}));
	}

	async addMessage(message: Omit<DEX_Message, "id" | "created_at">) {
		const id = crypto.randomUUID();
		await this.transaction("rw", [this.messages, this.threads], async () => {
			await this.messages.add({
				...message,
				id,
				created_at: new Date()
			});

			// Update the thread's last_message_at timestamp
			await this.threads.where("id").equals(message.threadId).modify({
				last_message_at: new Date(),
				updated_at: new Date()
			});
		});
		return id;
	}

	async createThread(
		thread: Omit<
			DEX_Thread,
			"created_at" | "updated_at" | "last_message_at" | "id"
		>
	) {
		const newThread = await this.threads.add({
			...thread,
			id: crypto.randomUUID(),
			created_at: new Date(),
			updated_at: new Date(),
			last_message_at: new Date(),
			isPinned: false
		});

		return newThread;
	}

	async updateThread(id: string, updates: Partial<DEX_Thread>) {
		await this.threads
			.where("id")
			.equals(id)
			.modify({
				...updates,
				updated_at: new Date()
			});
	}

	async deleteThread(id: string) {
		await this.transaction("rw", [this.threads, this.messages], async () => {
			// Delete all messages in the thread first
			await this.messages.where("threadId").equals(id).delete();
			// Then delete the thread itself
			await this.threads.where("id").equals(id).delete();
		});
	}

	async deleteEverything() {
		await this.delete();
	}
}

export const dxdb = new ChatDB();
