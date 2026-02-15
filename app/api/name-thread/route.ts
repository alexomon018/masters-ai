import { NextResponse } from "next/server";
import { runLLM } from "@/ai/llm";
import { tryCatch } from "@/utils";
import { nameThreadSchema } from "@/constants/llmValidationSchema";
import { AIMessage } from "@/ai/ai";

// Make sure POST is using the recommended function syntax
export async function POST(request: Request) {
	const body = await request.json();

	// Validate request body
	const validationResult = nameThreadSchema.safeParse(body);
	if (!validationResult.success) {
		return NextResponse.json(
			{ error: "Invalid request body", details: validationResult.error.issues },
			{ status: 400 }
		);
	}

	const { messages } = validationResult.data;

	const { data, error } = await tryCatch(runLLM(messages as AIMessage[]));

	if (error) {
		// eslint-disable-next-line no-console
		console.error("Error naming thread:", error);
		return NextResponse.json(
			{ error: "Failed to name thread" },
			{ status: 500 }
		);
	}

	return NextResponse.json(data);
}
