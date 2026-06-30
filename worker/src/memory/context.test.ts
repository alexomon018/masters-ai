import { describe, expect, it } from "vitest";
import { buildMemoryBlock, MAX_FACTS } from "./context";
import type { MemoryView } from "../repository/memory";

function view(partial: Partial<MemoryView> & Pick<MemoryView, "type" | "content">): MemoryView {
	return {
		memoryId: Math.random().toString(36).slice(2),
		key: null,
		source: "inferred",
		confidence: 0.9,
		status: "active",
		sourceThreadId: "t1",
		createdAt: 0,
		updatedAt: 0,
		...partial
	};
}

describe("buildMemoryBlock", () => {
	it("returns empty string when there is no active memory", () => {
		expect(buildMemoryBlock([])).toBe("");
		expect(
			buildMemoryBlock([view({ type: "fact", content: "x", status: "provisional" })])
		).toBe("");
	});

	it("renders preferences as key/value and facts as bullets", () => {
		const block = buildMemoryBlock([
			view({ type: "preference", key: "response_format", content: "json" }),
			view({ type: "fact", content: "Is building a Next.js app" }),
			view({ type: "episode", content: "Worked through closures" })
		]);
		expect(block).toContain("long-term memory");
		expect(block).toContain("- response_format: json");
		expect(block).toContain("- Is building a Next.js app");
		expect(block).toContain("- Worked through closures");
	});

	it("must not be cited as a course source", () => {
		const block = buildMemoryBlock([
			view({ type: "fact", content: "Is a senior engineer" })
		]);
		expect(block).toContain("ragSearch");
	});

	it("budgets the number of facts injected", () => {
		const facts = Array.from({ length: MAX_FACTS + 5 }, (_, i) =>
			view({ type: "fact", content: `Fact number ${i}` })
		);
		const block = buildMemoryBlock(facts);
		const bulletCount = block
			.split("\n")
			.filter((l) => l.startsWith("- ")).length;
		expect(bulletCount).toBe(MAX_FACTS);
	});
});
