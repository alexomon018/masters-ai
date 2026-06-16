const queryKeys = {
	threads: () => ["threads"] as const,
	messageLimit: () => ["message-limit"] as const,
	threadMessages: (threadId: string) =>
		["thread-messages", threadId] as const,
	threadFeedback: (subject: string, threadId: string) =>
		["thread-feedback", subject, threadId] as const
};

export default queryKeys;
