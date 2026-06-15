/**
 * Online scorers for PRODUCTION LOGS (not experiments).
 *
 * These run inside Braintrust's runtime against live chat traces. Online
 * scoring only exposes the ROOT span, which for our chat agent (`wrapAISDK`)
 * logs `input` (the model messages) and `output` = `{ finishReason, text }`.
 * There is NO tool-call / rag-result data on the root span, and no golden
 * `expected`/`category`. So every scorer here is reference-free and reads only
 * `output.text` + `input`.
 *
 * Tool-shaped checks (SingleRagSearch, Faithfulness/grounded-in-hits) are
 * intentionally NOT here: they need child-span tool calls/results that online
 * scoring cannot see. Keep those in the eval suite (experiments) only.
 *
 * Two kinds of scorer:
 *  - CitationGrounding: a deterministic CODE handler (no LLM, runs anywhere).
 *  - ResponseQuality: a DECLARATIVE LLM-as-a-judge (`messages`/`model`/
 *    `choiceScores`). Braintrust runs the model on its own proxy, so it works
 *    in the online runtime. A code handler that calls autoevals does NOT — it
 *    has no provider key there and fails with "Async scoring returned 500".
 *    The `model` must be served by a provider configured in the Braintrust org
 *    (Settings -> AI providers): an unconfigured model 404s in the scorer
 *    runtime even if the worker uses it (the worker's key is its own, Braintrust
 *    never sees it). Uses `gpt-5.4-mini` — cheaper than Haiku for the judge.
 *
 * Push with `yarn bt:push:scorers`, then attach in the Braintrust UI under
 * Configuration -> Online scoring (on the project's Logs).
 */
import { projects } from "braintrust";

const PROJECT_NAME = process.env.BRAINTRUST_PROJECT ?? "Masters AI (dev)";
const project = projects.create({ name: PROJECT_NAME });

type Json = unknown;

function getField(value: Json, key: string): Json {
	return value && typeof value === "object"
		? (value as Record<string, Json>)[key]
		: undefined;
}

/** Pull the assistant's final text out of the logged root output. */
function extractText(output: Json): string {
	if (typeof output === "string") return output;
	const direct = getField(output, "text");
	if (typeof direct === "string") return direct;
	const content = getField(output, "content");
	if (Array.isArray(content)) {
		return content
			.map((part) => {
				const t = getField(part, "text");
				return typeof t === "string" ? t : "";
			})
			.join("")
			.trim();
	}
	return "";
}

/** Text of the last user turn from the logged root input. */
function extractLastUserText(input: Json): string {
	if (typeof input === "string") return input;
	const messages = getField(input, "messages") ?? getField(input, "prompt");
	if (!Array.isArray(messages)) return "";
	for (let i = messages.length - 1; i >= 0; i -= 1) {
		const m = messages[i];
		if (getField(m, "role") !== "user") continue;
		const content = getField(m, "content");
		if (typeof content === "string") return content;
		return extractText(m);
	}
	return "";
}

const BRAND_REGEX = /\bfrontend masters\b/i;
const DISCLAIMER_PATTERNS: RegExp[] = [
	/\b(don'?t|doesn'?t|do not|does not|didn'?t|did not)\s+(have|cover|include|contain|teach|offer)\b/i,
	/\bno\s+(relevant|specific|detailed|matching|course|courses|content|material|transcripts?)\b/i,
	/\bcouldn'?t\s+find\b/i,
	/\bdidn'?t\s+find\b/i,
	/\bnot\s+(covered|included|available|part of|in\b)/i,
	/\boutside\s+(the\s+)?scope\b/i
];

function splitSentences(text: string): string[] {
	return text
		.split(/[.!?]+\s+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

// Deterministic code scorer: when the answer invokes Frontend Masters, every
// FM sentence should be either affirmatively attributing course material or
// honestly disclaiming coverage. We surface the count of plain attributing
// sentences so a reviewer can spot over-claims; with no retrieved hits on the
// root span this is the strongest grounding signal a production log supports.
project.scorers.create({
	name: "CitationGrounding (online)",
	slug: "citation-grounding-online",
	description:
		"Deterministic: when the answer mentions Frontend Masters, reports how many FM sentences attribute vs. disclaim. Reads output.text only.",
	handler: ({ output }: { output: Json }) => {
		const text = extractText(output);
		if (!BRAND_REGEX.test(text)) return null;

		const fmSentences = splitSentences(text).filter((s) =>
			BRAND_REGEX.test(s)
		);
		if (fmSentences.length === 0) return null;

		const disclaiming = (s: string) =>
			DISCLAIMER_PATTERNS.some((re) => re.test(s));
		const attributing = fmSentences.filter((s) => !disclaiming(s));

		return {
			name: "CitationGrounding",
			score: 1,
			metadata: {
				fmSentenceCount: fmSentences.length,
				attributingCount: attributing.length,
				attributing
			}
		};
	}
});

// Declarative LLM-as-a-judge. Braintrust runs `model` on its own proxy, so no
// provider key is needed in the scorer (unlike an autoevals code handler).
// {{input}} and {{output}} are filled from the logged root span.
project.scorers.create({
	name: "ResponseQuality (online)",
	slug: "response-quality-online",
	description:
		"Reference-free LLM rubric: helpful, on-topic, no fabricated Frontend Masters courses or instructors.",
	model: "gpt-5.4-mini",
	useCot: true,
	choiceScores: { a: 1, b: 0.75, c: 0.5, d: 0.25, e: 0 },
	messages: [
		{
			role: "user",
			content: `You are grading the Frontend Masters AI assistant, a programming tutor.

User input:
{{input}}

Assistant's answer:
{{output}}

Grade the answer on these reference-free criteria:
- Directly helpful and on-topic for the user's question.
- Does NOT invent Frontend Masters course names or instructor names.
- Clear, accurate, and professional.

How good is the answer overall?
(a) Excellent on all criteria
(b) Good, minor issues
(c) Mediocre
(d) Poor
(e) Unhelpful or fabricated content`
		}
	]
});

// Portable now that the worker copies tool/rag facts onto the root span via
// logSpanMetadata: { toolNames, ragSearchCount, ragResultText }. These are NOT
// readable from the auto-traced AI SDK output alone (tool data lives on child
// spans), so they depend on that worker-side logging.
project.scorers.create({
	name: "SingleRagSearch (online)",
	slug: "single-rag-search-online",
	description:
		"Penalizes more than one ragSearch call in a single turn. Reads metadata.ragSearchCount logged by the worker.",
	handler: ({ metadata }: { metadata: Json }) => {
		const count = getField(metadata, "ragSearchCount");
		if (typeof count !== "number" || count === 0) return null;
		return {
			name: "SingleRagSearch",
			score: count <= 1 ? 1 : 0,
			metadata: { count }
		};
	}
});

// Declarative LLM judge: is the answer grounded in the retrieved transcripts.
// Only meaningful when the worker logged ragResultText; the template skips
// (returns no score) when it is blank because the rubric explicitly allows it.
project.scorers.create({
	name: "Faithfulness (online)",
	slug: "faithfulness-online",
	description:
		"LLM judge: is the answer grounded in the retrieved Frontend Masters transcript chunks (metadata.ragResultText).",
	model: "gpt-5.4-mini",
	useCot: true,
	choiceScores: { a: 1, b: 0.5, c: 0 },
	messages: [
		{
			role: "user",
			content: `You are checking whether an AI tutor's answer is faithful to the retrieved Frontend Masters transcript sources.

Retrieved sources:
{{metadata.ragResultText}}

User input:
{{input}}

Assistant's answer:
{{output}}

If the retrieved sources are empty, answer (a).
Otherwise, judge whether the claims in the answer are supported by the sources:
(a) Fully supported (or no sources to contradict)
(b) Partially supported — some claims go beyond the sources
(c) Unsupported — the answer asserts course content not in the sources`
		}
	]
});

const IDENTITY_QUESTION_PATTERNS = [
	/\b(who|what)\s+are\s+you\b/i,
	/\bwho('?s| is)\s+this\b/i,
	/\bwhat\s+(is|are)\s+(this|you)\b/i
];

// Internals the assistant must never disclose when asked who it is.
const PROMPT_LEAK_PATTERNS = [
	/\bvector database\b/i,
	/\bsystem prompt\b/i,
	/\btranscripts? (from|of) .*frontend masters/i,
	/\bindexed?\b.*\btranscripts?\b/i
];

// Deterministic: only fires when the user asked an identity question. A good
// identity answer names Frontend Masters and leaks no implementation details.
project.scorers.create({
	name: "IdentityBehavior (online)",
	slug: "identity-behavior-online",
	description:
		"On 'who/what are you?' turns: answer should mention Frontend Masters and not leak internals (vector DB, system prompt, transcript indexing).",
	handler: ({ input, output }: { input: Json; output: Json }) => {
		const question = extractLastUserText(input);
		if (!IDENTITY_QUESTION_PATTERNS.some((re) => re.test(question)))
			return null;

		const text = extractText(output);
		if (!text) return null;

		const mentionsFm = BRAND_REGEX.test(text);
		const matchedLeaks = PROMPT_LEAK_PATTERNS.filter((re) =>
			re.test(text)
		).map((re) => re.source);
		const ok = mentionsFm && matchedLeaks.length === 0;

		return {
			name: "IdentityBehavior",
			score: ok ? 1 : 0,
			metadata: { mentionsFm, leaksPrompt: matchedLeaks.length > 0, matchedLeaks }
		};
	}
});

// The system prompt bans apologetic phrasing and empty answers. Deterministic
// guard against both — fires on every assistant turn.
const APOLOGY_PATTERNS = [/\bi'?m sorry\b/i, /\bi apologi[sz]e\b/i];

project.scorers.create({
	name: "ResponsePhrasing (online)",
	slug: "response-phrasing-online",
	description:
		"Deterministic: penalizes banned apologetic phrasing ('I'm sorry', 'I apologize') and empty answers.",
	handler: ({ output }: { output: Json }) => {
		const text = extractText(output).trim();
		if (!text) {
			return {
				name: "ResponsePhrasing",
				score: 0,
				metadata: { empty: true }
			};
		}
		const matchedApologies = APOLOGY_PATTERNS.filter((re) =>
			re.test(text)
		).map((re) => re.source);
		return {
			name: "ResponsePhrasing",
			score: matchedApologies.length === 0 ? 1 : 0,
			metadata: { empty: false, matchedApologies }
		};
	}
});
