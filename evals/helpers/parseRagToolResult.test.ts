import { describe, expect, it } from "vitest";

import { parseRagHits, parseRagToolResult } from "./parseRagToolResult";

describe("parseRagToolResult", () => {
	it("parses formatted hits and ignores empty/no-result responses", () => {
		const formatted = `[Course: React Fundamentals | Instructor: Jane | Timestamp: 1:00 | Score: 0.91]
Server components render on the server.

---

[Course: React Fundamentals | Instructor: Jane | Timestamp: 2:00 | Score: 0.88]
Client components need use client.`;

		expect(parseRagToolResult(formatted)).toEqual([
			"Server components render on the server.",
			"Client components need use client.",
		]);
		expect(parseRagHits(formatted)).toEqual([
			{
				courseName: "React Fundamentals",
				teacherName: "Jane",
				text: "Server components render on the server.",
			},
			{
				courseName: "React Fundamentals",
				teacherName: "Jane",
				text: "Client components need use client.",
			},
		]);
		expect(
			parseRagToolResult(
				"No relevant content found in the Frontend Masters course database."
			)
		).toEqual([]);
	});
});
