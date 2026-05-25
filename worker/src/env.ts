// Centralized Env shape. Every Worker module that needs request-scoped secrets
// or bindings reads this type. Keeping it in one file means a typo in a key
// name fails at the binding site, not silently at runtime.

import type { MastersChatAgent as MastersChatAgentClass } from "./agent";

export interface Env {
	// Durable Object binding for the agent. The DO class must match wrangler.jsonc.
	MastersChatAgent: DurableObjectNamespace<MastersChatAgentClass>;

	// D1 binding for the per-user thread index (currently unused at the agent
	// layer; kept for future server-side thread listing).
	THREAD_INDEX: D1Database;

	// LLM provider secrets.
	OPENAI_API_KEY: string;
	ANTHROPIC_API_KEY: string;

	// Braintrust tracing. Optional — when unset the logger is never started
	// and all instrumentation is a no-op, so the worker runs without it.
	BRAINTRUST_API_KEY?: string;

	// Selects the Braintrust project: "production" → prod project, anything
	// else (preview / development / unset) → dev project. Set per wrangler env.
	BRAINTRUST_ENV?: string;

	// Upstash Vector for RAG retrieval over Frontend Masters transcripts.
	UPSTASH_VECTOR_REST_URL: string;
	UPSTASH_VECTOR_REST_TOKEN: string;

	// Upstash Redis for per-day message quotas. Same instance the Next.js
	// app used; this is the worker-side accessor for it.
	UPSTASH_REDIS_REST_URL: string;
	UPSTASH_REDIS_REST_TOKEN: string;

	// Clerk secret used to verify session tokens on WebSocket upgrade. The
	// browser passes the Clerk session JWT as the `token` query parameter.
	CLERK_SECRET_KEY: string;

	// Shared HMAC secret used by middleware.ts (signs the anon cookie) and
	// the worker (verifies it). MUST match across both. Without it, any
	// caller could spoof an anonId and bypass per-day quotas.
	ANON_ID_SECRET: string;

	// Comma-separated allowlist of browser origins permitted to call the
	// worker. Used by the CORS layer to set Access-Control-Allow-Origin
	// reflectively (not "*"). Example: "https://femasters.guru,http://localhost:3000"
	ALLOWED_ORIGINS: string;
}

// The subset of env the tool layer needs. Tools are built per-request with
// only the keys they require — no global env imports inside tool modules.
export interface ToolEnv {
	UPSTASH_VECTOR_REST_URL: string;
	UPSTASH_VECTOR_REST_TOKEN: string;
}
