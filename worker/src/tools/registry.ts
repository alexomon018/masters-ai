import { makeRagSearch } from "./rag-search";
import { makeListCourses } from "./list-courses";
import { makeListCoursesByTopic } from "./list-courses-by-topic";
import { makeListInstructors, makeCatalogStats } from "./list-instructors";
import { makeListRecentCourses } from "./list-recent-courses";
import type { ToolEnv } from "../env";

export function buildTools(env: ToolEnv) {
	return {
		ragSearch: makeRagSearch(env),
		listCoursesByInstructor: makeListCourses(env),
		listCoursesByTopic: makeListCoursesByTopic(env),
		listAllInstructors: makeListInstructors(env),
		catalogStats: makeCatalogStats(env),
		listRecentCourses: makeListRecentCourses(env),
	};
}
