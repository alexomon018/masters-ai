import { generateText as defaultGenerateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { ToolEnv } from "../env";
import { tryCatch } from "../../../utils/tryCatch";

const REWRITE_MODEL = "claude-haiku-4-5";

const REWRITE_SYSTEM_PROMPT =
	"Rewrite the user's question into a concise, keyword-rich vector search query for Frontend Masters course transcripts. Treat the user's question as the source of truth; the model's draft query is only a hint and may be vague, padded, or wrong. Output only the search query — no quotes, no preamble. Include the core technology name and technical concept.";

export function isRagQueryRewriteEnabled(env: {
	RAG_QUERY_REWRITE?: string | boolean;
}): boolean {
	const raw = env.RAG_QUERY_REWRITE;
	if (typeof raw === "boolean") return raw;
	return raw === "1" || raw === "true";
}

export interface RagQueryRewriteContext {
	/**
	 * The user's actual question. Used as the source of truth for the rewrite
	 * so retrieval quality stops depending on whether a weak chat model wrote a
	 * good `query` argument — the model's query becomes a hint, not the input.
	 */
	userMessage?: string;
}

// Injectable so tests can exercise the rewrite and error-fallback paths
// without a live Anthropic call. Narrowed to the one field we read (`text`)
// so a stub doesn't need to satisfy the full generic generateText signature.
// The Worker omits this and gets the real one.
export type GenerateTextFn = (args: {
	model: ReturnType<ReturnType<typeof createAnthropic>["languageModel"]>;
	system: string;
	prompt: string;
	temperature: number;
}) => Promise<{ text: string }>;

export async function maybeRewriteRagQuery(
	query: string,
	env: Pick<ToolEnv, "ANTHROPIC_API_KEY" | "RAG_QUERY_REWRITE">,
	context?: RagQueryRewriteContext,
	generateTextFn: GenerateTextFn = defaultGenerateText
): Promise<string> {
	if (!isRagQueryRewriteEnabled(env)) return query;
	if (!env.ANTHROPIC_API_KEY?.trim()) return query;

	const trimmed = query.trim();
	const userMessage = context?.userMessage?.trim();
	if (trimmed.length === 0 && !userMessage) return query;

	const anthropic = createAnthropic({
		apiKey: env.ANTHROPIC_API_KEY ?? "",
	});

	const prompt = userMessage
		? `User question: ${userMessage}\nModel's draft search query: ${trimmed || "(none)"}`
		: trimmed;

	// On failure, fall back to the best available non-empty query input rather
	// than degrading to a whitespace-only `query`.
	const fallbackQuery = trimmed.length > 0 ? query : userMessage || query;

	const { data: result, error } = await tryCatch(
		generateTextFn({
			model: anthropic.languageModel(REWRITE_MODEL),
			system: REWRITE_SYSTEM_PROMPT,
			prompt,
			temperature: 0,
		})
	);

	if (error) {
		// A rewrite failure must never fail the search — fall back so retrieval
		// still runs.
		// eslint-disable-next-line no-console
		console.error(
			`[ragQueryRewrite] rewrite failed, using fallback query: ${error.message}`
		);
		return fallbackQuery;
	}

	const rewritten = result.text.trim();
	return rewritten.length > 0 ? rewritten : fallbackQuery;
}
