import {
	AIChatAgent,
	type ChatResponseResult,
	type OnChatMessageOptions
} from "@cloudflare/ai-chat";
import type { Connection, ConnectionContext, WSMessage } from "agents";
import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	type LanguageModel,
	type ModelMessage,
	type StreamTextOnFinishCallback,
	type ToolSet
} from "ai";
import { z } from "zod";
import { compactHistory } from "./context/compaction";
import { streamAgent } from "./agent-core";
import { flushBraintrust, logSpanMetadata, startBraintrust } from "./braintrust";
import {
	getModel,
	isByokOnlyModel,
	modelProvider,
	resolveWorkerModelLabel,
	type LLMModel
} from "./providers";
import { getDecryptedUserKey } from "./routes/user-keys";
import { checkAndIncrementQuota } from "./quota";
import {
	ChatError,
	classifyChatError,
	encodeChatError
} from "./chat-errors";
import { claimThread } from "./thread-access";
import { captureAiGeneration, providerFromModel } from "./posthog";
import { tryCatch } from "../../utils/tryCatch";
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
	byokKey: string | undefined;
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

		const parsed = chatBodySchema.safeParse(options?.body ?? {});
		const body = parsed.success ? parsed.data : {};
		const modelId = resolveWorkerModelLabel(body.model ?? DEFAULT_MODEL);

		// BYOK-only frontier models require the caller's own provider key. They
		// bill the user directly, so they bypass our daily quota; free models
		// (env key) stay quota-gated as before.
		let byokKey: string | undefined;
		if (isByokOnlyModel(modelId)) {
			const key = await getDecryptedUserKey(
				this.env,
				identity.userId,
				modelProvider(modelId)
			);
			if (!key) {
				throw new ChatError(
					"NO_API_KEY",
					"This model needs your own API key. Connect one in Settings to use it."
				);
			}
			byokKey = key;
		} else {
			const quota = await checkAndIncrementQuota(
				{
					UPSTASH_REDIS_REST_URL: this.env.UPSTASH_REDIS_REST_URL,
					UPSTASH_REDIS_REST_TOKEN: this.env.UPSTASH_REDIS_REST_TOKEN
				},
				identity.userId,
				identity.isAuthenticated
			);
			if (!quota.allowed) {
				// Anon users get a sign-in CTA rendered client-side, so keep the
				// message itself neutral; signed-in users just learn the limit
				// resets tomorrow.
				const tail =
					quota.isAuthenticated === false
						? ""
						: " Your limit resets tomorrow.";
				throw new ChatError(
					"QUOTA_EXCEEDED",
					`You've reached today's message limit of ${quota.limit}.${tail}`
				);
			}
		}

		const model = getModel(modelId, this.env, byokKey);

		const fullHistory = await convertToModelMessages(this.messages);
		const messages = await compactHistory(fullHistory, { model });

		return {
			identity,
			model,
			modelId,
			byokKey,
			userData: body.userData,
			messages
		};
	}

	async onChatMessage(
		_onFinish: StreamTextOnFinishCallback<ToolSet>,
		options?: OnChatMessageOptions
	) {
		startBraintrust(this.env.BRAINTRUST_API_KEY, this.env.BRAINTRUST_ENV);

		// Gate failures (quota, thread access) happen before the model stream
		// starts, so a raw throw would crash the turn with no client-visible
		// reason. Emit an error-only UI stream instead, using the same encoded
		// wire format the model-stream onError uses, so the SPA handles both
		// the same way.
		const gate = await tryCatch(this.gateChatTurn(options));
		if (!gate.success) {
			return this.errorStreamResponse(gate.error);
		}

		const { identity, model, modelId, userData, messages } = gate.data;
		const turnStartMs = Date.now();

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
			},
			onFinish: ({ steps, usage, finishReason }) => {
				const toolCalls = steps.flatMap((step) => step.toolCalls ?? []);
				const toolResults = steps.flatMap((step) => step.toolResults ?? []);
				const toolNames = toolCalls.map((call) => call.toolName);
				const ragResults = toolResults
					.filter((r) => r.toolName === "ragSearch")
					.map((r) =>
						typeof r.output === "string" ? r.output : JSON.stringify(r.output)
					);
				logSpanMetadata({
					toolNames,
					ragSearchCount: toolNames.filter((n) => n === "ragSearch").length,
					ragResultText: ragResults.join("\n\n---\n\n")
				});

				if (this.env.POSTHOG_API_KEY) {
					this.ctx.waitUntil(
						captureAiGeneration(
							this.env.POSTHOG_API_KEY,
							identity.userId,
							{
								$ai_trace_id: this.name,
								$ai_session_id: this.name,
								$ai_model: modelId,
								$ai_provider: providerFromModel(modelId),
								$ai_input_tokens: usage?.inputTokens,
								$ai_output_tokens: usage?.outputTokens,
								$ai_latency: (Date.now() - turnStartMs) / 1000,
								$ai_stream: true,
								$ai_stop_reason: finishReason
							}
						)
					);
				}
			}
		});

		return result.toUIMessageStreamResponse({
			onError: (error) => {
				const { code, message } = classifyChatError(error);
				if (code !== "QUOTA_EXCEEDED") {
					console.error("[chat] stream error:", error);
				}
				return encodeChatError(code, message);
			}
		});
	}

	// Surfaces a pre-stream gate failure as an error-only UI message stream so
	// the client receives it through its normal error channel rather than as a
	// crashed turn. The error part text is the same encoded `CODE:message` the
	// SPA parses for model-stream errors.
	private errorStreamResponse(err: unknown): Response {
		const { code, message } = classifyChatError(err);
		if (code !== "QUOTA_EXCEEDED") {
			console.error("[chat] gate error:", err);
		}
		const stream = createUIMessageStream({
			execute: () => {
				throw new Error(encodeChatError(code, message));
			},
			onError: (error) =>
				error instanceof Error ? error.message : encodeChatError(code, message)
		});
		return createUIMessageStreamResponse({ stream });
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
