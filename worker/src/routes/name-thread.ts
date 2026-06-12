import { z } from "zod";
import { generateText as defaultGenerateText } from "../braintrust";
import { getModel } from "../providers";
import { redisPipeline } from "../redis";
import type { Env } from "../env";

// Lets evals (running under Node) inject the Node-wrapped generateText so
// Braintrust metrics are captured. The DO/worker entry omits it and gets the
// workerd-wrapped default. Mirrors AiSdkOverride in agent-core.ts.
type GenerateTextFn = typeof defaultGenerateText;

// Ported from the old Next.js ai/llm.ts + app/api/name-thread/route.ts.
// Auto-titles a freshly started thread. Authentication (ticket / anonId) is
// resolved at the worker edge; this handler receives the resolved identity.

export interface NameThreadMessage {
	role: "user" | "assistant";
	content: string;
}

interface AuthedRequest {
	userId: string;
}

// Per-day cap on naming requests by tracking id — same identity scheme as the
// chat quota. Stops a caller from burning Anthropic credits via this endpoint.
const NAME_LIMIT_PER_DAY = 100;
const ONE_DAY_S = 24 * 60 * 60;

const JSON_HEADERS = { "content-type": "application/json" } as const;

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

// Mirrors constants/llmValidationSchema.ts:nameThreadSchema. `model` is
// accepted for parity with the old client but naming always uses Haiku.
// Content/array bounds keep a caller from pushing an arbitrarily large
// transcript into the paid Haiku call — titling only needs the opening
// exchange anyway.
const MAX_MESSAGE_CONTENT = 8000;
const MAX_MESSAGES = 8;

const messageSchema = z.union([
	z.object({
		role: z.literal("assistant"),
		content: z.string().max(MAX_MESSAGE_CONTENT),
		function_call: z.any().optional()
	}),
	z.object({
		role: z.literal("user"),
		content: z.string().max(MAX_MESSAGE_CONTENT)
	})
]);

export const nameThreadBodySchema = z.object({
	messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
	model: z.enum(["claude-haiku-4-5", "gpt-5.4-mini"]).optional()
});

export type NameThreadBody = z.infer<typeof nameThreadBodySchema>;

const nameThreadPrompt = `You generate a short title for a conversation between a user and an assistant about programming and Frontend Masters courses.

Rules:
- Output ONLY the title text. No quotes, no markdown, no asterisks, no angle brackets, no special tokens.
- 2 to 4 words. Title case.
- Name the specific topic. Prefer concrete technical nouns (e.g. "React Server Components", "Redux Toolkit Setup", "CSS Grid Layout").
- Do NOT include the words "Chat", "Thread", "Conversation", "Discussion", "Question", "Help".
- Do NOT echo conversation markers like HUMAN, ASSISTANT, END, etc.
- If the topic is unclear, output exactly: New Chat`;

export function sanitizeTitle(raw: string): string {
	let title = raw.trim();
	title = title.replace(/<<[^>]*>>/g, "").replace(/<[A-Z_]{2,}>/g, "");
	title = title.replace(/[*`]+/g, "");
	title = title.replace(/^["'““”’](.*)["'““”’]$/, "$1");
	title = title.replace(/\s+/g, " ").trim();
	if (title.length > 40) title = `${title.slice(0, 37).trim()}…`;
	return title || "New Chat";
}

// Bundle the exchange into a single user turn. Sending [user, assistant] as
// multi-turn made Claude continue the conversation rather than emit a title.
const buildTitleRequest = (messages: NameThreadMessage[]): string => {
	const transcript = messages
		.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
		.join("\n\n");
	return `Generate a title for the following exchange.\n\n${transcript}`;
};

export async function runNameThread(
	env: Env,
	messages: NameThreadMessage[],
	generateText: GenerateTextFn = defaultGenerateText
): Promise<string> {
	const { text } = await generateText({
		model: getModel("claude-haiku-4-5", env),
		system: nameThreadPrompt,
		messages: [{ role: "user", content: buildTitleRequest(messages) }]
	});
	return sanitizeTitle(text);
}

async function checkRateLimit(env: Env, trackingId: string): Promise<boolean> {
	const key = `name_thread_count:${trackingId}`;
	const [incrRes] = await redisPipeline(env, [
		["INCR", key],
		["EXPIRE", key, String(ONE_DAY_S), "NX"]
	]);
	const next = Number(incrRes?.result ?? 0);
	if (next > NAME_LIMIT_PER_DAY) {
		await redisPipeline(env, [["DECR", key]]);
		return false;
	}
	return true;
}

export async function nameThread(
	env: Env,
	auth: AuthedRequest,
	body: NameThreadBody
): Promise<Response> {
	const allowed = await checkRateLimit(env, auth.userId);
	if (!allowed) {
		return json({ error: "Daily naming limit reached" }, 429);
	}

	try {
		const title = await runNameThread(
			env,
			body.messages as NameThreadMessage[]
		);
		return json({ title });
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error naming thread:", error);
		return json({ error: "Failed to name thread" }, 500);
	}
}
