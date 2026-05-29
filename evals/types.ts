// Re-export golden case types for eval scorers and Braintrust tasks.
export type {
	RagGoldenCase as RagTestCase,
	ChatGoldenCase as ChatTestCase,
	NameThreadGoldenCase as NameThreadTestCase,
} from "./golden";
