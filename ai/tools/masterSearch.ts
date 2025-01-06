import { createAIFunction } from "@dexaai/dexter";
import { z } from "zod";
import { queryMasters } from "../rag";

export const frontendMastersSearchToolDefinition = {
	name: "frontendMastersSearch",
	description:
		"Give an answer to the user's question based on the Frontend Masters course content or any programming related question and engineering related question",
	argsSchema: z.object({
		query: z
			.string()
			.describe(
				"A search query to find programming concepts, tutorials, and best practices from Frontend Masters courses"
			),
		course: z
			.string()
			.optional()
			.describe("Optionally filter results to a specific course name"),
		courseTeacher: z
			.string()
			.optional()
			.describe("Optionally filter results to courses by a specific instructor")
	})
};

type MastersMetadata = {
	courseTeacher?: string;
	course?: string;
};

export const frontendMastersSearch = createAIFunction(
	frontendMastersSearchToolDefinition,
	async (toolArgs) => {
		const { query, course, courseTeacher } = toolArgs;

		const filters: MastersMetadata = {
			...(courseTeacher && { courseTeacher }),
			...(course && { course })
		};

		try {
			const results = await queryMasters(query, filters as any);

			return results.map((result) => ({
				course: result.metadata?.course,
				courseTeacher: result.metadata?.teacherName,
				description: result.data
			}));
		} catch (error) {
			console.error(error);
			throw new Error(
				"Failed to search for programming and engineering answers on frontend masters platform"
			);
		}
	}
);
