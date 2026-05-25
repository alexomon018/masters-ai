import { anthropic } from "@ai-sdk/anthropic";
// Braintrust-wrapped generateText — same signature as the `ai` export, but
// each call is traced. Logger setup + dev/prod project routing live there.
import { generateText } from "./braintrust";

export interface NameThreadMessage {
	role: "user" | "assistant";
	content: string;
}

const nameThreadPrompt = `You generate a short title for a conversation between a user and an assistant about programming and Frontend Masters courses.

Rules:
- Output ONLY the title text. No quotes, no markdown, no asterisks, no angle brackets, no special tokens.
- 2 to 4 words. Title case.
- Name the specific topic. Prefer concrete technical nouns (e.g. "React Server Components", "Redux Toolkit Setup", "CSS Grid Layout").
- Do NOT include the words "Chat", "Thread", "Conversation", "Discussion", "Question", "Help".
- Do NOT echo conversation markers like HUMAN, ASSISTANT, END, etc.
- If the topic is unclear, output exactly: New Chat`;

// Strip anything the model adds despite the prompt: markdown emphasis, code
// fences, surrounding quotes, conversation tokens, and excess whitespace.
// Trim to a reasonable length so a verbose model can't blow out the sidebar.
function sanitizeTitle(raw: string): string {
	let title = raw.trim();
	// Strip <<TOKEN>> / <TOKEN> markers and anything that looks like one.
	title = title.replace(/<<[^>]*>>/g, "").replace(/<[A-Z_]{2,}>/g, "");
	// Strip markdown emphasis (** *), backticks, and surrounding quotes.
	title = title.replace(/[*`]+/g, "");
	title = title.replace(/^["'""''](.*)["'""'']$/, "$1");
	// Collapse whitespace including any leftover newlines.
	title = title.replace(/\s+/g, " ").trim();
	// Clamp to ~40 chars; the sidebar truncates anyway, but a short DB write
	// keeps the UI predictable.
	if (title.length > 40) title = `${title.slice(0, 37).trim()}…`;
	return title || "New Chat";
}

// Bundle the exchange into a single user turn. Sending [user, assistant]
// as multi-turn made Claude continue the conversation rather than emit a
// title — every stored title ended up looking like another assistant
// reply ("Regarding your question about…", etc.). Framing it as one
// request makes the system prompt actually load-bearing.
const buildTitleRequest = (messages: NameThreadMessage[]): string => {
	const transcript = messages
		.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
		.join("\n\n");
	return `Generate a title for the following exchange.\n\n${transcript}`;
};

export const runLLM = async (messages: NameThreadMessage[]) => {
	const { text } = await generateText({
		model: anthropic.languageModel("claude-haiku-4-5"),
		system: nameThreadPrompt,
		messages: [{ role: "user", content: buildTitleRequest(messages) }]
	});

	return sanitizeTitle(text);
};
