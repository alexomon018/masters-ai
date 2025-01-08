"use server";

import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage } from "ai";

import tools from "@/ai/tools";
import { runAgent } from "@/ai/agent";

// eslint-disable-next-line import/prefer-default-export
export const POST = async (req: NextRequest) => {
	try {
		const body = (await req.json()) as { messages: VercelChatMessage[] };

		console.log(body);
		const question = body.messages.at(-1);

		if (!question) {
			return new NextResponse("question not found", { status: 400 });
		}

		const result = await runAgent({
			tools,
			userMessage: question.content
		});

		console.log({ result });

		return NextResponse.json(result);
	} catch (e) {
		return NextResponse.json({ error: (e as Error).message }, { status: 500 });
	}
};
