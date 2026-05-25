// MastersChatAgent — the Durable Object that owns one chat thread.
//
// AIChatAgent gives us:
// - this.messages : UIMessage[] persisted in DO SQLite, hydrated on every request
// - onChatMessage(): hook invoked when a new user message arrives
// - persistence is automatic; we never write SQL directly
//
// The browser connects directly over WebSocket via useAgent + useAgentChat.
// Auth runs in `routeAgentRequest`'s `onBeforeConnect` hook (see worker.ts)
// so it can reject with HTTP 401 before the WebSocket is upgraded. The
// identity is then forwarded to this DO via internal request headers,
// which onConnect reads and stashes on the *connection* (not on `this`)
// so it survives DO hibernation.

import {
	AIChatAgent,
	type ChatResponseResult,
	type OnChatMessageOptions
} from "@cloudflare/ai-chat";
import type { Connection, ConnectionContext } from "agents";
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
import type { Env } from "./env";

const DEFAULT_MODEL: LLMModel = "claude-haiku-4-5";

interface ConnectionIdentity {
	userId: string;
	isAuthenticated: boolean;
}

// Body fields the browser sends with each turn. Validated at the boundary
// because `OnChatMessageOptions.body` is typed as `Record<string, unknown>`
// — without this Zod check, a malformed client could put anything into
// `userData` and we'd interpolate it straight into the system prompt.
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

	async onConnect(connection: Connection, ctx: ConnectionContext) {
		const userId = ctx.request.headers.get("x-masters-user-id");
		const isAuthenticated =
			ctx.request.headers.get("x-masters-is-authenticated") === "1";
		// Stash identity on the *connection*, not on `this`. Instance fields
		// are lost when the DO hibernates (which happens whenever the room
		// sits idle — common with eagerly-opened sockets from the home page).
		// `connection.setState` is backed by the WebSocket attachment and
		// survives hibernation.
		if (userId) {
			connection.setState({ userId, isAuthenticated });
		}
		await super.onConnect(connection, ctx);
	}

	private getIdentity(): ConnectionIdentity | null {
		for (const conn of this.getConnections<ConnectionIdentity>()) {
			const state = conn.state;
			if (state?.userId) return state;
		}
		return null;
	}

	// All the pre-stream concerns (auth, quota, body shape, model selection,
	// history compaction) collected in one place. Returns the resolved
	// inputs streamAgent needs, or throws — `onChatMessage` becomes pure
	// orchestration on top.
	private async gateChatTurn(
		options?: OnChatMessageOptions
	): Promise<ChatGate> {
		const identity = this.getIdentity();
		if (!identity) {
			throw new Error("Chat message before connection authentication");
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

		// Replay full DO history into model messages, then collapse anything
		// older than the recent window into a summary system message. Keeps
		// the request payload from growing unbounded.
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
		// Start Braintrust tracing on first use. The key + environment come
		// off the Env binding (process.env is empty at module scope on
		// Workers); no-ops when the key is unset so the worker runs fine
		// without Braintrust.
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
				UPSTASH_VECTOR_REST_TOKEN: this.env.UPSTASH_VECTOR_REST_TOKEN
			}
		});

		// UI-message stream emits text parts AND tool parts (with state).
		// The browser receives `tool-ragSearch` parts that transition from
		// `input-streaming` → `output-available`, which is what makes the
		// inline tool-call status pill possible.
		return result.toUIMessageStreamResponse();
	}

	// Fires after the assistant message is persisted — the reliable point to
	// flush Braintrust spans on Workers (better than awaiting result.text in
	// onChatMessage, which can race the SDK's stream teardown).
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
