import { makeRagSearch } from "./rag-search";
import type { ToolEnv } from "../env";

export function buildTools(env: ToolEnv) {
	return {
		ragSearch: makeRagSearch(env),
	};
}
