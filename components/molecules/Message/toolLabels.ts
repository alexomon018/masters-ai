type ToolStatusKind = "running" | "complete" | "error";

interface ToolLabel {
	running: string;
	complete: string;
}

const TOOL_LABELS: Record<string, ToolLabel> = {
	ragSearch: {
		running: "Searching course transcripts",
		complete: "Searched course transcripts"
	},
	listCoursesByInstructor: {
		running: "Looking up courses by instructor",
		complete: "Found courses by instructor"
	},
	listCoursesByTopic: {
		running: "Looking up courses by topic",
		complete: "Found courses by topic"
	},
	listAllInstructors: {
		running: "Looking up instructors",
		complete: "Found instructors"
	},
	catalogStats: {
		running: "Checking the course catalog",
		complete: "Checked the course catalog"
	},
	listRecentCourses: {
		running: "Looking up recent courses",
		complete: "Found recent courses"
	}
};

const humanize = (name: string) =>
	name
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.replace(/^./, (c) => c.toUpperCase());

export const toolStatusLabel = (
	name: string,
	status: ToolStatusKind
): string => {
	const label = TOOL_LABELS[name];

	if (status === "error") {
		return label
			? `${label.complete} — failed`
			: `${humanize(name)} — failed`;
	}

	if (!label) {
		return humanize(name);
	}

	return status === "running" ? label.running : label.complete;
};
