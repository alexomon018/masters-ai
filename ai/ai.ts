import OpenAI from "openai";

export const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});

export type AIMessage =
	| OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam
	| { role: "user"; content: string }
	| { role: "tool"; content: string; tool_call_id: string };
