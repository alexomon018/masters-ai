import {
	generateText as defaultGenerateText,
	type LanguageModel,
	type ModelMessage
} from "ai";

// Injectable so tests can exercise incremental/full compaction without a live
// model call. Narrowed to the fields used. The Worker omits it and gets the
// real generateText.
export type CompactGenerateTextFn = (args: {
	model: LanguageModel;
	system: string;
	prompt: string;
}) => Promise<{ text: string }>;

// A summary persisted in the DO across turns. `coveredCount` is how many of the
// current turn's model messages (from the front) the summary already accounts
// for, so the next turn only has to summarize what was added on top instead of
// re-summarizing the whole tail every time. `anchor` fingerprints the last
// summarized message so reuse can be rejected if head-truncation
// (maxPersistedMessages) shifted the prefix out from under `coveredCount`.
export interface PersistedSummary {
	coveredCount: number;
	text: string;
	anchor?: string;
}

// Fingerprint of a single message, stable across turns as long as the message
// itself is retained. Used as the summary's anchor; a mismatch means the
// summarized prefix was evicted and the summary can no longer be trusted.
function fingerprintMessage(m: ModelMessage): string {
	return `${m.role}|${messageToText(m).slice(0, 200)}`;
}

// Anchor for a summary covering the first `coveredCount` messages: the
// fingerprint of the last message it summarized. Exported for tests.
export function computeSummaryAnchor(
	messages: ModelMessage[],
	coveredCount: number
): string | undefined {
	if (coveredCount <= 0 || coveredCount > messages.length) return undefined;
	return fingerprintMessage(messages[coveredCount - 1]);
}

interface CompactOptions {
	threshold?: number;
	keepLast?: number;
	model: LanguageModel;
	priorSummary?: PersistedSummary | null;
	generateTextFn?: CompactGenerateTextFn;
}

export interface CompactResult {
	messages: ModelMessage[];
	// The summary to persist for next turn. null means "no summary in play"
	// (under threshold) — callers may clear any stored summary.
	summary: PersistedSummary | null;
}

const DEFAULT_THRESHOLD = 32_000;
const DEFAULT_KEEP_LAST = 4;

function characterCount(messages: ModelMessage[]): number {
	let total = 0;
	for (const m of messages) {
		if (typeof m.content === "string") {
			total += m.content.length;
		} else if (Array.isArray(m.content)) {
			for (const part of m.content) {
				if (
					typeof part === "object" &&
					part &&
					"text" in part &&
					typeof part.text === "string"
				) {
					total += part.text.length;
				}
			}
		}
	}
	return total;
}

function messageToText(m: ModelMessage): string {
	const role = m.role.toUpperCase();
	if (typeof m.content === "string") return `${role}: ${m.content}`;
	if (Array.isArray(m.content)) {
		const parts = m.content
			.map((part) => {
				if (typeof part !== "object" || !part) return "";
				if ("text" in part && typeof part.text === "string") return part.text;
				if ("toolName" in part) return `[tool call: ${part.toolName}]`;
				return "";
			})
			.filter(Boolean)
			.join(" ");
		return `${role}: ${parts}`;
	}
	return `${role}:`;
}

const SUMMARY_SYSTEM_PROMPT =
	"You compress conversation history into terse summaries that preserve every decision the user made, every Frontend Masters course or instructor cited, and any concrete code/API the assistant proposed. Output a single paragraph, no preamble.";

function summaryMessage(text: string): ModelMessage {
	return {
		role: "system",
		content: `Summary of earlier conversation: ${text}`
	};
}

// Replaces older messages with a running summary once history grows past the
// threshold, keeping the prompt bounded as a conversation gets long. When a
// prior summary is supplied it is extended rather than recomputed, so the cost
// of compaction stays roughly constant instead of growing with history length.
export async function compactHistory(
	messages: ModelMessage[],
	options: CompactOptions
): Promise<CompactResult> {
	const threshold = options.threshold ?? DEFAULT_THRESHOLD;
	const keepLast = options.keepLast ?? DEFAULT_KEEP_LAST;
	const prior = options.priorSummary ?? null;
	const generateTextFn = options.generateTextFn ?? defaultGenerateText;

	if (characterCount(messages) < threshold) {
		return { messages: messages.slice(), summary: prior };
	}
	if (messages.length <= keepLast) {
		return { messages: messages.slice(), summary: prior };
	}

	const olderCount = messages.length - keepLast;
	const olderMessages = messages.slice(0, olderCount);
	const recentMessages = messages.slice(olderCount);

	// Reuse the prior summary only when it still describes a valid prefix of the
	// current history. coveredCount alone is not enough: head-truncation
	// (maxPersistedMessages) shifts the prefix without changing counts, so also
	// require the boundary message to still match the stored anchor. Any
	// mismatch (or a pre-anchor summary) forces a safe full recompute.
	const canReuse =
		prior !== null &&
		prior.coveredCount <= olderCount &&
		prior.anchor !== undefined &&
		computeSummaryAnchor(olderMessages, prior.coveredCount) === prior.anchor;
	const newOlder = canReuse
		? olderMessages.slice(prior.coveredCount)
		: olderMessages;

	let summaryText: string;
	if (canReuse && newOlder.length === 0) {
		// Nothing new fell out of the keep-last window — reuse the prior summary
		// verbatim, no model call.
		summaryText = prior.text;
	} else {
		const transcript = newOlder.map(messageToText).join("\n");
		const prompt =
			canReuse && prior
				? `Existing summary of the conversation so far:\n${prior.text}\n\nExtend it to incorporate these newer messages, returning a single combined summary:\n\n${transcript}`
				: `Summarize this conversation:\n\n${transcript}`;
		const result = await generateTextFn({
			model: options.model,
			system: SUMMARY_SYSTEM_PROMPT,
			prompt
		});
		summaryText = result.text;
	}

	return {
		messages: [summaryMessage(summaryText), ...recentMessages],
		summary: {
			coveredCount: olderCount,
			text: summaryText,
			anchor: computeSummaryAnchor(olderMessages, olderCount)
		}
	};
}
