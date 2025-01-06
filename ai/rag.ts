import { Index as UpstashIndex } from "@upstash/vector";

// Initialize Upstash Vector client
const index = new UpstashIndex({
	url: process.env.UPSTASH_VECTOR_REST_URL as string,
	token: process.env.UPSTASH_VECTOR_REST_TOKEN as string
});

type MastersMetadata = {
	courseName?: string;
	fileName?: string;
	timestamp?: string;
	teacherName?: string;
};

// eslint-disable-next-line import/prefer-default-export
export const queryMasters = async (
	query: string,
	filters?: Partial<MastersMetadata>,
	topK: number = 5
) => {
	// Build filter string if filters provided
	let filterStr = "";
	if (filters) {
		const filterParts = Object.entries(filters)
			.filter(([, value]) => value !== undefined)
			.map(([key, value]) => `${key}='${value}'`);

		if (filterParts.length > 0) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			filterStr = filterParts.join(" AND ");
		}
	}

	// Query the vector store
	return index.query({
		data: query,
		topK,
		// filter: filterStr || undefined,
		includeMetadata: true,
		includeData: true
	});
};
