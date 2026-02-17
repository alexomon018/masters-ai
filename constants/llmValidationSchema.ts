import { z } from "zod";

// Existing schemas
const formSchema = z.object({
	username: z.string().min(2).max(50)
});

// LLM Model validation
const llmModelSchema = z.enum([
	"gpt-4o-mini",
	"gpt-4o",
	"gpt-5",
	"claude-3-5-sonnet-latest",
	"claude-3-haiku-20240307",
	"claude-sonnet-4-5",
	"claude-opus-4-6",
	"grok-2-latest",
	"gpt-3.5-turbo"
]);

// Chat message validation
const chatMessageSchema = z.object({
	content: z.string(),
	role: z.enum(["user", "assistant", "system", "function"]),
	name: z.string().optional(),
	function_call: z.any().optional()
});

// Masters API request validation
export const mastersRequestSchema = z.object({
	messages: z.array(chatMessageSchema),
	model: llmModelSchema,
	id: z.string()
});

// Masters API response validation for error cases
export const mastersErrorResponseSchema = z.object({
	error: z.string()
});

const aiMessageSchema = z.union([
	z.object({
		role: z.literal("assistant"),
		content: z.string(),
		function_call: z.any().optional()
	}),
	z.object({
		role: z.literal("user"),
		content: z.string()
	})
]);

const nameThreadSchema = z.object({
	messages: z.array(aiMessageSchema),
	model: llmModelSchema
});

export {
	formSchema,
	llmModelSchema,
	chatMessageSchema,
	aiMessageSchema,
	nameThreadSchema
};
