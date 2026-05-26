import type { MastersChatAgent as MastersChatAgentClass } from "./agent";

export interface Env {
	MastersChatAgent: DurableObjectNamespace<MastersChatAgentClass>;
	THREAD_INDEX: D1Database;
	OPENAI_API_KEY: string;
	ANTHROPIC_API_KEY: string;
	BRAINTRUST_API_KEY?: string;
	BRAINTRUST_ENV?: string;
	UPSTASH_VECTOR_REST_URL: string;
	UPSTASH_VECTOR_REST_TOKEN: string;
	UPSTASH_REDIS_REST_URL: string;
	UPSTASH_REDIS_REST_TOKEN: string;
	CLERK_SECRET_KEY: string;
	ANON_ID_SECRET: string;
	ALLOWED_ORIGINS: string;
}

export interface ToolEnv {
	UPSTASH_VECTOR_REST_URL: string;
	UPSTASH_VECTOR_REST_TOKEN: string;
}
