import { describe, expect, it } from "vitest";

import { parseRagHits, parseRagToolResult } from "./parseRagToolResult";

describe("parseRagToolResult", () => {
	it("parses numbered source hits and ignores empty/no-result responses", () => {
		const formatted = `Answer using ONLY these transcript sources. When citing, use the exact Course and Instructor names shown below.

Source [1] — Course: React Fundamentals | Instructor: Jane | Timestamp: 1:00
Server components render on the server.

---

Source [2] — Course: React Fundamentals | Instructor: Jane | Timestamp: 2:00
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

	it("still parses legacy score-based hit headers", () => {
		const formatted = `[Course: React Fundamentals | Instructor: Jane | Timestamp: 1:00 | Score: 0.91]
Server components render on the server.`;

		expect(parseRagHits(formatted)).toEqual([
			{
				courseName: "React Fundamentals",
				teacherName: "Jane",
				text: "Server components render on the server.",
			},
		]);
	});
});
