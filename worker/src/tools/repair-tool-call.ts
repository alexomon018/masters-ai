import type { ToolCallRepairFunction, ToolSet } from "ai";

export const repairToolCall: ToolCallRepairFunction<ToolSet> = async ({
	toolCall,
	error,
}) => {
	if (toolCall.toolName !== "ragSearch") return null;
	if (typeof error !== "object" || error === null) return null;
	if (!("toolInput" in error)) return null;

	const raw = error.toolInput;
	const queryMatch = /"query"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(raw);
	if (!queryMatch) return null;

	const query = queryMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
	const teacherMatch = /"teacherName"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(raw);
	const courseMatch = /"courseName"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(raw);

	const repaired: Record<string, string> = { query };
	if (teacherMatch) {
		repaired.teacherName = teacherMatch[1]
			.replace(/\\"/g, '"')
			.replace(/\\\\/g, "\\");
	}
	if (courseMatch) {
		repaired.courseName = courseMatch[1]
			.replace(/\\"/g, '"')
			.replace(/\\\\/g, "\\");
	}

	return {
		...toolCall,
		input: JSON.stringify(repaired),
	};
};
