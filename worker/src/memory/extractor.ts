// Background extraction: after a turn completes, distill durable memory
// candidates from the recent exchange. This runs off the request thread (the
// agent schedules it via waitUntil) so it never adds latency to the user-visible
// reply. Every candidate it proposes still has to pass the promotion gate — the
// extractor only nominates, it does not write.

import {
	generateObject as defaultGenerateObject,
	type LanguageModel,
	type ModelMessage
} from "ai";
import { z } from "zod";
import { getModel } from "../providers";
import type { Env } from "../env";
import type { MemoryCandidate } from "./types";

const EXTRACTION_MODEL = "claude-haiku-4-5";

const MAX_CANDIDATES = 8;
const MAX_TRANSCRIPT_MESSAGES = 8;
const MAX_MESSAGE_CHARS = 2000;

export function isMemoryExtractionEnabled(env: {
	MEMORY_EXTRACTION?: string | boolean;
	ANTHROPIC_API_KEY?: string;
}): boolean {
	if (!env.ANTHROPIC_API_KEY?.trim()) return false;
	const raw = env.MEMORY_EXTRACTION;
	if (typeof raw === "boolean") return raw;
	// Default on: opt out explicitly with "0"/"false".
	if (raw === "0" || raw === "false") return false;
	return true;
}

const rawCandidateSchema = z.object({
	type: z.enum(["preference", "fact", "episode"]),
	key: z.string().max(64).nullish(),
	content: z.string().min(1).max(500),
	confidence: z.number().min(0).max(1)
});

const extractionSchema = z.object({
	candidates: z.array(rawCandidateSchema).max(MAX_CANDIDATES)
});

type ExtractionResult = z.infer<typeof extractionSchema>;

// Narrowed so a test stub doesn't have to satisfy generateObject's full
// overloaded signature; the Worker passes the real implementation.
export type GenerateObjectFn = (args: {
	model: LanguageModel;
	schema: typeof extractionSchema;
	system: string;
	prompt: string;
}) => Promise<{ object: ExtractionResult }>;

const defaultGenerate: GenerateObjectFn = (args) =>
	defaultGenerateObject(args) as Promise<{ object: ExtractionResult }>;

const EXTRACTION_SYSTEM_PROMPT = `You extract durable, reusable memory about a USER from a chat between the user and a Frontend Masters programming tutor. You are building long-term memory that helps future sessions feel continuous.

Extract ONLY information that is durable and worth remembering across sessions:
- preference: a stable way the user wants the assistant to behave or respond. Set "key" to a short snake_case slug (e.g. response_format, verbosity, language, framework) and "content" to the value (e.g. "TypeScript", "terse", "step by step").
- fact: a durable assertion about the user, their background, goals, skill level, or the project they are working on (e.g. "Is building a Next.js e-commerce app", "Is new to React hooks", "Prefers functional programming"). Leave "key" null.
- episode: a one-sentence summary of what was accomplished or worked through in this session, only if a coherent task was discussed. Leave "key" null.

Hard rules:
- Do NOT extract transient questions, one-off requests, the assistant's answers, or Frontend Masters course/instructor names or course content.
- Do NOT invent information that was not clearly expressed.
- "content" must be a concise statement about the user, phrased in the third person.
- Set "confidence" honestly in 0..1: explicit user statements ~0.9-1.0; reasonable inferences ~0.6-0.8; weak guesses below 0.5 (which will be dropped).
- If there is nothing durable to remember, return an empty "candidates" array. Returning nothing is the common, correct outcome.`;

function messageText(content: ModelMessage["content"]): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((part) =>
				typeof part === "object" &&
				part &&
				"text" in part &&
				typeof part.text === "string"
					? part.text
					: ""
			)
			.filter(Boolean)
			.join(" ")
			.trim();
	}
	return "";
}

// Only user/assistant text from the tail of the conversation — tool calls and
// system messages carry no durable signal about the user and only add noise.
export function buildExtractionTranscript(messages: ModelMessage[]): string {
	const recent = messages
		.filter((m) => m.role === "user" || m.role === "assistant")
		.slice(-MAX_TRANSCRIPT_MESSAGES);

	return recent
		.map((m) => {
			const text = messageText(m.content).slice(0, MAX_MESSAGE_CHARS);
			if (!text) return "";
			return `${m.role === "user" ? "User" : "Assistant"}: ${text}`;
		})
		.filter(Boolean)
		.join("\n\n");
}

export async function extractMemoryCandidates(
	env: Env,
	transcript: string,
	sourceThreadId: string | null,
	generateObjectFn: GenerateObjectFn = defaultGenerate
): Promise<MemoryCandidate[]> {
	if (!transcript.trim()) return [];

	let result: ExtractionResult;
	try {
		const { object } = await generateObjectFn({
			model: getModel(EXTRACTION_MODEL, env),
			schema: extractionSchema,
			system: EXTRACTION_SYSTEM_PROMPT,
			prompt: `Conversation:\n\n${transcript}`
		});
		result = object;
	} catch (error) {
		// Extraction is best-effort enrichment; a failure must never surface to
		// the user (it already ran in the background) or block memory the next
		// turn would still re-observe.
		// eslint-disable-next-line no-console
		console.error(
			`[memory] extraction failed: ${error instanceof Error ? error.message : String(error)}`
		);
		return [];
	}

	return result.candidates.map((c) => ({
		type: c.type,
		key: c.key ?? null,
		content: c.content,
		source: "inferred" as const,
		confidence: c.confidence,
		sourceThreadId
	}));
}
