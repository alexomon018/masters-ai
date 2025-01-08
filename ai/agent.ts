import { ChatModel, createAIRunner, MsgUtil } from "@dexaai/dexter";
import type { AIFunction } from "@dexaai/dexter";
import { addMessages, getMessages, getSummary } from "./memory";
import { systemPrompt as defaultSystemPrompt } from "./systemPrompt";

export const createAgent = (tools: AIFunction[]) =>
	createAIRunner({
		chatModel: new ChatModel({
			params: {
				model: "gpt-4o-mini",
				temperature: 0.1
			}
		}),
		functions: tools,
		maxIterations: 5,
		onRetriableError: (error: Error) => {
			console.log(`Error: ${error.message}, retrying...`);
		}
	});

export const runAgent = async ({
	userMessage,
	tools
}: {
	userMessage: string;
	tools: AIFunction[];
	// eslint-disable-next-line consistent-return
}) => {
	const agent = createAgent(tools);

	await addMessages([MsgUtil.user(userMessage)]);
	const history = await getMessages();
	const summary = await getSummary();

	try {
		const result = await agent({
			messages: [
				{
					role: "system",
					content: `${
						defaultSystemPrompt
					}. Conversation summary so far: ${summary}`
				},
				...history
			],
			handleUpdate(chunk) {
				return chunk;
			}
		});

		await addMessages(
			result.messages.filter(
				(msg) => msg.role !== "system" && msg.role !== "user"
			)
		);

		return result;
	} catch (error) {
		console.error(error);
	}
};
