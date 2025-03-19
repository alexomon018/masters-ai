import { NextResponse } from "next/server";
import { runLLM } from "@/ai/llm";

// Add an OPTIONS handler to properly handle preflight requests for CORS
export async function OPTIONS() {
	return NextResponse.json({}, { status: 200 });
}

// Make sure POST is using the recommended function syntax
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { messages } = body;

		const response = await runLLM(messages);

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error naming thread:", error);
		return NextResponse.json(
			{ error: "Failed to name thread" },
			{ status: 500 }
		);
	}
}
