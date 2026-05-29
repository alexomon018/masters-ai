import { describe, expect, it } from "vitest";

import {
	anyCourseHit,
	courseLabels,
	courseNameMatches,
	labelInText,
} from "./courseMatch";

describe("courseMatch", () => {
	it("merges expectedCourses and legacy expectedCourse", () => {
		expect(
			courseLabels({
				expectedCourse: "react",
				expectedCourses: ["next js"],
				expectedTopCourse: "next js",
			})
		).toEqual({ anyOf: ["next js", "react"], top: "next js" });
	});

	it("matches formatted Frontend Masters course slugs", () => {
		expect(courseNameMatches("next js v3 Scott Moss", "next js")).toBe(true);
		expect(anyCourseHit(["swift ios Maximiliano Firtman"], ["javascript"])).toBe(
			false
		);
	});

	it("treats hyphens and spaces as equivalent in labels", () => {
		expect(
			labelInText(
				"Anjana Vakil's Functional-First Steps v2 course",
				"functional first"
			)
		).toBe(true);
		expect(courseNameMatches("functional first steps v2", "functional first")).toBe(
			true
		);
	});

	it("matches multi-word labels at token boundaries", () => {
		expect(courseNameMatches("Next.js v3", "next js")).toBe(true);
	});

	it("does not match labels that are substrings of a larger word", () => {
		expect(courseNameMatches("Discussion", "css")).toBe(false);
		expect(labelInText("The discussion was great", "css")).toBe(false);
	});

	it("matches standalone token labels", () => {
		expect(courseNameMatches("CSS Grid", "css")).toBe(true);
	});

	it("does not match when label tokens do not appear contiguously", () => {
		expect(courseNameMatches("CSS Foundations", "css grid")).toBe(false);
	});

	it("matches multi-word labels embedded in free text with punctuation", () => {
		expect(
			labelInText("In the Next.js v3 course by Scott Moss", "next js")
		).toBe(true);
	});
});
