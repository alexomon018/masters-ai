import { JSONFilePreset } from "lowdb/node";
import { MsgUtil, type Msg } from "@dexaai/dexter";
import { v4 as uuidv4 } from "uuid";
import { summarizeMessages } from "./llm";

export type MessageWithMetadata = Msg & {
	id: string;
	createdAt: string;
};

type Data = {
	summary: string;
	messages: MessageWithMetadata[];
};

export const addMetadata = (message: Msg) => ({
	...message,
	id: uuidv4(),
	createdAt: new Date().toISOString()
});

export const removeMetadata = (message: MessageWithMetadata) => {
	const { id, createdAt, ...rest } = message;
	return rest;
};

const defaultData: Data = {
	summary: "",
	messages: []
};

export const getDb = async () => {
	const db = await JSONFilePreset<Data>("db.json", defaultData);
	return db;
};

export const addMessages = async (messages: Msg[]) => {
	const db = await getDb();
	db.data.messages.push(...messages.map(addMetadata));
	await db.write();

	// If we hit the threshold, trigger summarization as a separate operation
	if (db.data.messages.length >= 10) {
		await updateSummary();
	}
};

// New separate function for handling summarization
export const updateSummary = async () => {
	const db = await getDb();

	const copy = JSON.parse(JSON.stringify(db.data.messages));

	// Create minimal message objects for summarization
	const messagesToSummarize = copy.slice(0, 10).map((msg: Msg) => {
		if (msg.role === "tool") {
			// Keep message structure but remove content
			const { content, ...rest } = msg;
			return {
				...rest,
				content: ""
			};
		}
		return msg;
	});

	const summary = await summarizeMessages(messagesToSummarize);
	db.data.summary = summary || "";
	await db.write();
};

export const getMessages = async () => {
	const db = await getDb();
	const messages = db.data.messages.map(removeMetadata);
	const lastFive = messages.slice(-5);

	// If first message is a tool response, get one more message before it
	if (lastFive[0]?.role === "tool") {
		const sixthMessage = messages[messages.length - 6];
		if (sixthMessage) {
			return [...[sixthMessage], ...lastFive];
		}
	}

	return lastFive;
};

export const getSummary = async () => {
	const db = await getDb();
	return db.data.summary;
};

export const saveToolResponse = async (
	toolCallId: string,
	toolResponse: string | object
	// eslint-disable-next-line arrow-body-style
) => {
	return addMessages([
		MsgUtil.toolResult(
			typeof toolResponse === "string"
				? toolResponse
				: JSON.stringify(toolResponse),
			toolCallId
		)
	]);
};
