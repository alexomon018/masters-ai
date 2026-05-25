// Shape the chat-agent eval task returns. Derived from runAgent's result:
// the final answer text plus the flat list of tool names invoked across all
// steps (extracted from result.toolCalls so the scorers don't depend on the
// AI SDK's tool-call object shape).

export interface ChatAgentOutput {
	text: string;
	toolNames: string[];
	casual: boolean;
}
