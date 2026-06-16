const queryKeys = {
	threads: () => ["threads"] as const,
	messageLimit: () => ["message-limit"] as const,
	threadMessages: (threadId: string) =>
		["thread-messages", threadId] as const,
	threadFeedback: (threadId: string) => ["thread-feedback", threadId] as const
};

export default queryKeys;
