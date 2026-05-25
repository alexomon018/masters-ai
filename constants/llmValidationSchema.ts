import { z } from "zod";

// Generic example schema used by the Form storybook story. The Form
// organism is reused across the app, but the story needs *some* concrete
// validator to demonstrate it.
const formSchema = z.object({
	username: z.string().min(2).max(50)
});

// Model lineup the Next.js side accepts on inbound API calls. The worker
// has its own copy at worker/src/providers.ts:LLMModel — they MUST stay
// in lockstep. The Zod enum lets us reject stale model ids from
// out-of-date browsers at the API boundary rather than at the LLM call.
const llmModelSchema = z.enum([
	"claude-haiku-4-5",
	"claude-sonnet-4-6",
	"gpt-5.5",
	"gpt-5.4",
	"gpt-5.4-mini"
]);

// `/api/name-thread` body shape.
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

export { formSchema, llmModelSchema, aiMessageSchema, nameThreadSchema };
