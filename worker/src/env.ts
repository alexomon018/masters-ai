import type { MastersChatAgent as MastersChatAgentClass } from "./agent";

export interface Env {
	MastersChatAgent: DurableObjectNamespace<MastersChatAgentClass>;
	THREAD_INDEX: D1Database;
	OPENAI_API_KEY: string;
	ANTHROPIC_API_KEY: string;
	BRAINTRUST_API_KEY?: string;
	BRAINTRUST_ENV?: string;
	POSTHOG_API_KEY?: string;
	UPSTASH_VECTOR_REST_URL: string;
	UPSTASH_VECTOR_REST_TOKEN: string;
	UPSTASH_REDIS_REST_URL: string;
	UPSTASH_REDIS_REST_TOKEN: string;
	CLERK_SECRET_KEY: string;
	ANON_ID_SECRET: string;
	ALLOWED_ORIGINS: string;
	RAG_QUERY_REWRITE?: string;
	// Background long-term-memory extraction. Default on; set to "0"/"false" to
	// disable (e.g. to cut Haiku spend). Extraction also requires ANTHROPIC_API_KEY.
	MEMORY_EXTRACTION?: string;
	KEY_ENCRYPTION_SECRET: string;
}

export interface ToolEnv {
	UPSTASH_VECTOR_REST_URL: string;
	UPSTASH_VECTOR_REST_TOKEN: string;
	// Optional: absent under Node-based evals, where the catalog lookup tool
	// degrades gracefully. Present in the Worker (from Env.THREAD_INDEX).
	THREAD_INDEX?: D1Database;
	ANTHROPIC_API_KEY?: string;
	RAG_QUERY_REWRITE?: string | boolean;
}
