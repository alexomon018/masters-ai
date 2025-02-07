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

		this.version(1).stores({
			projects: "id, name, created_at, updated_at",
			threads: "id, projectId, created_at, updated_at, last_message_at",
			messages: "id, threadId, created_at, [threadId+created_at]"
		});

		// Add hooks for automatic timestamps
		this.threads.hook("creating", (primKey, obj) => {
			obj.created_at = new Date();
			obj.updated_at = new Date();
			obj.last_message_at = new Date();
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
		thread: Omit<DEX_Thread, "created_at" | "updated_at" | "last_message_at">
	) {
		await this.threads.add({
			...thread,
			created_at: new Date(),
			updated_at: new Date(),
			last_message_at: new Date()
		});
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
			// Delete all messages in the thread
			await this.messages.where("threadId").equals(id).delete();
			// Delete the thread itself
			await this.threads.delete(id);
		});
	}
}

export const dxdb = new ChatDB();
