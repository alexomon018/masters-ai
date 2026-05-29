interface CourseExpectations {
	expectedCourse?: string;
	expectedCourses?: string[];
	expectedTopCourse?: string;
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeCourseToken(value: string): string {
	return value.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

function wordBoundaryMatch(haystack: string, label: string): boolean {
	const normalizedHaystack = normalizeCourseToken(haystack).replace(
		/[^a-z0-9\s]/g,
		" "
	);
	const normalizedLabel = normalizeCourseToken(label).replace(
		/[^a-z0-9\s]/g,
		" "
	);
	const collapsedHaystack = normalizedHaystack.replace(/\s+/g, " ").trim();
	const collapsedLabel = normalizedLabel.replace(/\s+/g, " ").trim();
	if (collapsedLabel === "") return false;
	const pattern = new RegExp(
		`(^|\\s)${escapeRegex(collapsedLabel)}($|\\s)`
	);
	return pattern.test(collapsedHaystack);
}

export function courseLabels(tc: CourseExpectations): {
	anyOf: string[];
	top: string | undefined;
} {
	const anyOf = [
		...(tc.expectedCourses ?? []),
		...(tc.expectedCourse ? [tc.expectedCourse] : []),
	].map((s) => normalizeCourseToken(s));
	const unique = [...new Set(anyOf)];
	const top = (tc.expectedTopCourse ?? tc.expectedCourses?.[0])
		? normalizeCourseToken(tc.expectedTopCourse ?? tc.expectedCourses![0])
		: undefined;
	return { anyOf: unique, top };
}

export function courseNameMatches(courseName: string, label: string): boolean {
	return wordBoundaryMatch(courseName, label);
}

export function labelInText(text: string, label: string): boolean {
	return wordBoundaryMatch(text, label);
}

export function anyCourseHit(
	courseNames: string[],
	labels: string[]
): boolean {
	if (labels.length === 0) return false;
	return courseNames.some((name) =>
		labels.some((label) => courseNameMatches(name, label))
	);
}
