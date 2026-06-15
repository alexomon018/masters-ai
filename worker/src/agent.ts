import {
	AIChatAgent,
	type ChatResponseResult,
	type OnChatMessageOptions
} from "@cloudflare/ai-chat";
import type { Connection, ConnectionContext, WSMessage } from "agents";
import {
	convertToModelMessages,
	type LanguageModel,
	type ModelMessage,
	type StreamTextOnFinishCallback,
	type ToolSet
} from "ai";
import { z } from "zod";
import { compactHistory } from "./context/compaction";
import { streamAgent } from "./agent-core";
import { flushBraintrust, startBraintrust } from "./braintrust";
import {
	getModel,
	resolveWorkerModelLabel,
	type LLMModel
} from "./providers";
import { checkAndIncrementQuota } from "./quota";
import { claimThread } from "./thread-access";
import type { Env } from "./env";

const DEFAULT_MODEL: LLMModel = "claude-haiku-4-5";

interface ConnectionIdentity {
	userId: string;
	isAuthenticated: boolean;
}

// Validated at the boundary — malformed userData would reach the system prompt.
const userDataSchema = z.object({
	name: z.string().max(80),
	occupation: z.string().max(120),
	traits: z.string().max(400),
	preferences: z.string().max(400)
});

const chatBodySchema = z.object({
	model: z.string().optional(),
	userData: userDataSchema.optional()
});

type UserData = z.infer<typeof userDataSchema>;

interface ChatGate {
	identity: ConnectionIdentity;
	model: LanguageModel;
	modelId: LLMModel;
	userData: UserData | undefined;
	messages: ModelMessage[];
}

export class MastersChatAgent extends AIChatAgent<Env> {
	maxPersistedMessages = 200;

	// Connection that delivered the message currently being processed. A chat
	// turn always runs in the same wakeup as the message that triggered it, so
	// an instance field (which hibernation would wipe) is safe here.
	private senderConnection: Connection<ConnectionIdentity> | null = null;

	async onConnect(connection: Connection, ctx: ConnectionContext) {
		const userId = ctx.request.headers.get("x-masters-user-id");
		const isAuthenticated =
			ctx.request.headers.get("x-masters-is-authenticated") === "1";
		// connection.state survives DO hibernation; instance fields do not.
		if (userId) {
			connection.setState({ userId, isAuthenticated });
		}
		await super.onConnect(connection, ctx);
	}

	async onMessage(connection: Connection, message: WSMessage) {
		this.senderConnection = connection as Connection<ConnectionIdentity>;
		await super.onMessage(connection, message);
	}

	// Identity of the connection that sent the message being processed. While a
	// thread is unclaimed, connections with different identities can coexist on
	// the DO, so "first connection wins" could bill/attribute the wrong user.
	private getIdentity(): ConnectionIdentity | null {
		const senderState = this.senderConnection?.state;
		if (senderState?.userId) return senderState;
		for (const conn of this.getConnections<ConnectionIdentity>()) {
			const state = conn.state;
			if (state?.userId) return state;
		}
		return null;
	}

	private async gateChatTurn(
		options?: OnChatMessageOptions
	): Promise<ChatGate> {
		const identity = this.getIdentity();
		if (!identity) {
			throw new Error("Chat message before connection authentication");
		}

		// First message claims the thread in D1; a mismatch on a claimed thread
		// is rejected before any quota or model spend.
		const claim = await claimThread(this.env, identity.userId, this.name);
		if (!claim.ok) {
			throw new Error(claim.reason);
		}

		const quota = await checkAndIncrementQuota(
			{
				UPSTASH_REDIS_REST_URL: this.env.UPSTASH_REDIS_REST_URL,
				UPSTASH_REDIS_REST_TOKEN: this.env.UPSTASH_REDIS_REST_TOKEN
			},
			identity.userId,
			identity.isAuthenticated
		);
		if (!quota.allowed) {
			throw new Error(quota.reason ?? "Quota exceeded");
		}

		const parsed = chatBodySchema.safeParse(options?.body ?? {});
		const body = parsed.success ? parsed.data : {};
		const modelId = resolveWorkerModelLabel(body.model ?? DEFAULT_MODEL);
		const model = getModel(modelId, this.env);

		const fullHistory = await convertToModelMessages(this.messages);
		const messages = await compactHistory(fullHistory, { model });

		return {
			identity,
			model,
			modelId,
			userData: body.userData,
			messages
		};
	}

	async onChatMessage(
		_onFinish: StreamTextOnFinishCallback<ToolSet>,
		options?: OnChatMessageOptions
	) {
		startBraintrust(this.env.BRAINTRUST_API_KEY, this.env.BRAINTRUST_ENV);

		const { model, modelId, userData, messages } =
			await this.gateChatTurn(options);

		const result = streamAgent({
			model,
			modelLabel: modelId,
			messages,
			userData,
			env: {
				UPSTASH_VECTOR_REST_URL: this.env.UPSTASH_VECTOR_REST_URL,
				UPSTASH_VECTOR_REST_TOKEN: this.env.UPSTASH_VECTOR_REST_TOKEN,
				THREAD_INDEX: this.env.THREAD_INDEX,
				ANTHROPIC_API_KEY: this.env.ANTHROPIC_API_KEY,
				RAG_QUERY_REWRITE: this.env.RAG_QUERY_REWRITE,
			}
		});

		return result.toUIMessageStreamResponse();
	}

	// Flush after persistence — safer than awaiting in onChatMessage on Workers.
	protected onChatResponse(_result: ChatResponseResult): void {
		this.ctx.waitUntil(
			flushBraintrust().catch((err) => {
				console.error("[braintrust] flush failed:", err);
			})
		);
	}

	async clearHistory(): Promise<void> {
		await this.persistMessages([]);
	}
}
