import OpenAI from "openai";

// eslint-disable-next-line import/prefer-default-export
export const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});
