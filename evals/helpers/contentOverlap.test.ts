import { describe, expect, it } from "vitest";

import { overlapScore } from "./contentOverlap";

describe("overlapScore", () => {
	it("scores higher when the answer reuses hit vocabulary", () => {
		const hits = [
			"Server components render on the server without shipping JavaScript.",
		];
		const grounded =
			"Server components render on the server and avoid shipping component JavaScript.";
		const ungrounded = "Promises represent asynchronous work with pending and settled states.";

		expect(overlapScore(grounded, hits)).toBeGreaterThan(0.3);
		expect(overlapScore(ungrounded, hits)).toBeLessThan(overlapScore(grounded, hits));
	});

	it("returns zero when there are no hits", () => {
		expect(overlapScore("any answer", [])).toBe(0);
	});
});
