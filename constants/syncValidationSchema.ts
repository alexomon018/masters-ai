import { z } from "zod";

// Base schemas for common fields
const baseEntitySchema = z.object({
	id: z.string().uuid(),
	userProvidedId: z.string(),
	userId: z.string(),
	created_at: z.date(),
	updated_at: z.date()
});

// Thread validation schema
export const threadSchema = baseEntitySchema.extend({
	title: z.string(),
	projectId: z.string().uuid().nullable(),
	threadId: z.string(),
	last_message_at: z.date(),
	data: z.any().nullable() // SuperJSON result type
});

// Message validation schema
export const messageSchema = baseEntitySchema.extend({
	threadId: z.string(),
	data: z.any().nullable() // SuperJSON result type
});

// API Request validation schemas
export const syncRequestSchema = z.object({
	json: z.string() // SuperJSON stringified data
});

export const deleteRequestSchema = z
	.object({
		deleteAll: z.boolean().optional(),
		threadId: z.string().uuid().optional()
	})
	.refine(
		(data) => data.deleteAll || data.threadId,
		"Either deleteAll or threadId must be provided"
	);
