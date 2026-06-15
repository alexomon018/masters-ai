import { makeRagSearch } from "./rag-search";
import { makeListCourses } from "./list-courses";
import { makeListCoursesByTopic } from "./list-courses-by-topic";
import { makeListInstructors, makeCatalogStats } from "./list-instructors";
import { makeListRecentCourses } from "./list-recent-courses";
import type { RagQueryRewriteContext } from "./rag-query-rewrite";
import type { ToolEnv } from "../env";

export function buildTools(env: ToolEnv, context?: RagQueryRewriteContext) {
	return {
		ragSearch: makeRagSearch(env, context),
		listCoursesByInstructor: makeListCourses(env),
		listCoursesByTopic: makeListCoursesByTopic(env),
		listAllInstructors: makeListInstructors(env),
		catalogStats: makeCatalogStats(env),
		listRecentCourses: makeListRecentCourses(env),
	};
}
