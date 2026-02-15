import { streamText, stepCountIs, type ModelMessage } from "ai";
import type { LLMModel } from "@/types";
import { getModel } from "./providers";
import { agentSystemPrompt } from "./systemPrompt";
import { ragSearch } from "./tools/ragSearch";

interface AgentParams {
	messages: ModelMessage[];
	model: LLMModel;
	userData?: {
		name: string;
		occupation: string;
		traits: string;
		preferences: string;
	};
}

const CASUAL_PATTERN =
	/^\s*(hi|hey|hello|howdy|sup|yo|thanks|thank you|ok|okay|bye|goodbye|good morning|good evening|good night|what's up|how are you|who are you|what are you)\b/i;

function isCasualMessage(messages: ModelMessage[]): boolean {
	const last = messages.at(-1);
	if (!last || last.role !== "user" || typeof last.content !== "string") {
		return false;
	}
	return CASUAL_PATTERN.test(last.content);
}

export function runAgent({ messages, model, userData }: AgentParams) {
	const casual = isCasualMessage(messages);

	return streamText({
		model: getModel(model),
		system: agentSystemPrompt({ model, userData }),
		messages,
		tools: { ragSearch },
		activeTools: casual ? [] : undefined,
		stopWhen: stepCountIs(20),
	});
}
