import { describe, it, expect } from "vitest";
import { normalizeInstructor, slugToTitle, releaseDate } from "./course-name";

describe("normalizeInstructor", () => {
	it("canonicalizes known misspellings", () => {
		expect(normalizeInstructor("Biran Holt")).toBe("Brian Holt");
		expect(normalizeInstructor("the primagen")).toBe("The Primeagen");
	});

	it("passes through unknown names and trims", () => {
		expect(normalizeInstructor("  Scott Moss  ")).toBe("Scott Moss");
	});
});

describe("slugToTitle", () => {
	it("strips a trailing instructor name fused into the course slug", () => {
		expect(slugToTitle("algorithms The Primeagen", "The Primeagen")).toBe(
			"Algorithms"
		);
		expect(
			slugToTitle("algorithms practice the primeagen", "The Primeagen")
		).toBe("Algorithms Practice");
	});

	it("handles hyphenated slugs", () => {
		expect(slugToTitle("next-js-v3-scott-moss", "Scott Moss")).toBe(
			"Next JS v3"
		);
	});

	it("normalizes casing and known terms, keeps version tokens lowercase", () => {
		expect(slugToTitle("intermediate-react-v5", "Brian Holt")).toBe(
			"Intermediate React v5"
		);
		expect(slugToTitle("css-grid", "Jen Kramer")).toBe("CSS Grid");
	});

	it("strips a leading release date", () => {
		expect(slugToTitle("2023-01-15-typescript-mike-north", "Mike North")).toBe(
			"Typescript"
		);
	});
});

describe("releaseDate", () => {
	it("extracts a leading ISO date", () => {
		expect(releaseDate("2023-01-15-typescript")).toBe("2023-01-15");
	});

	it("returns empty when there is no date prefix", () => {
		expect(releaseDate("algorithms The Primeagen")).toBe("");
	});
});
