import { NextResponse } from "next/server";
import { runLLM } from "@/ai/llm";

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
