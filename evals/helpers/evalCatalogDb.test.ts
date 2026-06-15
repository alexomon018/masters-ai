import { describe, expect, it } from "vitest";

import { listCoursesForTopic } from "../../worker/src/tools/list-courses-by-topic";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../worker/db/schema";
import { createEvalCatalogDb } from "./evalCatalogDb";

describe("evalCatalogDb", () => {
	it("seeds a catalog usable by drizzle D1 queries", async () => {
		const dbBinding = await createEvalCatalogDb();
		const db = drizzle(dbBinding, { schema });
		const reactCourses = await listCoursesForTopic("React", db);

		expect(reactCourses.length).toBeGreaterThan(0);
	});
});
