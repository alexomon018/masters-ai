import type { Msg } from "@dexaai/dexter";
import { ChatModel } from "@dexaai/dexter";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { openai } from "./ai";
import { summarizePrompt, nameThreadPrompt } from "./systemPrompt";

export const runApprovalCheck = async (userMessage: string) => {
	const response = await openai.beta.chat.completions.parse({
		model: "gpt-4o",
		temperature: 0.1,
		response_format: zodResponseFormat(
			z.object({
				approved: z.boolean().describe("did the user say they approved or not")
			}),
			"math_reasoning"
		),
		messages: [
			{
				role: "system",
				content:
					"Determine if the user approved the image generation. If you are not sure, then it is not approved."
			},
			{ role: "user", content: userMessage }
		]
	});

	return response.choices[0].message.parsed?.approved;
};

export const summarizeMessages = async (messages: Msg[]) => {
	const chatModel = new ChatModel({
		params: {
			model: "gpt-4o-mini",
			temperature: 0.1
		}
	});

	const response = await chatModel.run({
		messages: [
			{
				role: "system",
				content: summarizePrompt
			},
			...messages
		]
	});

	return response.choices[0].message.content;
};

export const runLLM = async (messages: Msg[]) => {
	const response = await openai.chat.completions.create({
		model: "gpt-4o",
		messages: [{ role: "system", content: nameThreadPrompt }, ...messages]
	});

	return response.choices[0].message.content;
};
