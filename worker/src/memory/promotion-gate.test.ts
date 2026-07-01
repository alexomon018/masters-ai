import { describe, expect, it } from "vitest";
import {
	computeContentHash,
	evaluateCandidate,
	FACT_ACTIVE_CONFIDENCE
} from "./promotion-gate";

describe("evaluateCandidate", () => {
	it("rejects empty content", async () => {
		const result = await evaluateCandidate({ type: "fact", content: "   " });
		expect(result.outcome).toBe("rejected");
	});

	it("rejects content over the length cap", async () => {
		const result = await evaluateCandidate({
			type: "fact",
			content: "x".repeat(501),
			sourceThreadId: "t1"
		});
		expect(result).toMatchObject({ outcome: "rejected" });
	});

	it("rejects a preference without a key", async () => {
		const result = await evaluateCandidate({
			type: "preference",
			content: "json",
			source: "user_stated"
		});
		expect(result).toMatchObject({
			outcome: "rejected",
			reason: "preference requires a key"
		});
	});

	it("normalizes a preference key to snake_case and accepts it", async () => {
		const result = await evaluateCandidate({
			type: "preference",
			key: "Response Format",
			content: "JSON",
			source: "user_stated"
		});
		expect(result.outcome).toBe("accepted");
		if (result.outcome === "accepted") {
			expect(result.key).toBe("response_format");
			expect(result.status).toBe("active");
		}
	});

	it("rejects a fact below the confidence floor", async () => {
		const result = await evaluateCandidate({
			type: "fact",
			content: "User likes Vue",
			confidence: 0.5,
			sourceThreadId: "t1"
		});
		expect(result).toMatchObject({ outcome: "rejected" });
	});

	it("rejects an inferred fact without provenance", async () => {
		const result = await evaluateCandidate({
			type: "fact",
			content: "User is building a CLI",
			confidence: 0.9
		});
		expect(result).toMatchObject({
			outcome: "rejected",
			reason: "missing provenance"
		});
	});

	it("marks a low-confidence inferred fact provisional", async () => {
		const result = await evaluateCandidate({
			type: "fact",
			content: "User may prefer Postgres",
			confidence: FACT_ACTIVE_CONFIDENCE - 0.05,
			sourceThreadId: "t1"
		});
		expect(result.outcome).toBe("accepted");
		if (result.outcome === "accepted") expect(result.status).toBe("provisional");
	});

	it("marks a high-confidence inferred fact active", async () => {
		const result = await evaluateCandidate({
			type: "fact",
			content: "User is building a Next.js app",
			confidence: 0.95,
			sourceThreadId: "t1"
		});
		expect(result.outcome).toBe("accepted");
		if (result.outcome === "accepted") expect(result.status).toBe("active");
	});

	it("drops a stray key on a fact so hashing stays consistent", async () => {
		const result = await evaluateCandidate({
			type: "fact",
			key: "ignored",
			content: "User is a senior engineer",
			confidence: 0.9,
			sourceThreadId: "t1"
		});
		expect(result.outcome).toBe("accepted");
		if (result.outcome === "accepted") expect(result.key).toBeNull();
	});
});

describe("computeContentHash", () => {
	it("is stable and case-insensitive on content", async () => {
		const a = await computeContentHash("fact", null, "Uses TypeScript");
		const b = await computeContentHash("fact", null, "uses typescript");
		expect(a).toBe(b);
	});

	it("differs across types and keys", async () => {
		const fact = await computeContentHash("fact", null, "json");
		const pref = await computeContentHash("preference", "response_format", "json");
		expect(fact).not.toBe(pref);
	});
});
