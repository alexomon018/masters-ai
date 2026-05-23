// Tool registry. The agent receives one record of all available tools, but
// each tool lives in its own file under src/tools/ for clarity. Tools that
// need request-scoped credentials (Upstash, future Tavily, etc.) are built
// per-request via factory functions so API keys never leak across sessions.
//
// Mirrors the pattern from ai-engineering-fundamentals/src/tools.ts.

import { makeRagSearch } from "./rag-search";
import type { ToolEnv } from "../env";

export function buildTools(env: ToolEnv) {
	return {
		ragSearch: makeRagSearch(env),
	};
}
