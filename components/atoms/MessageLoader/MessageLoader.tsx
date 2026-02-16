import React from "react";

const MessageLoading: React.FC = () => (
	<article className="mb-2 flex items-center gap-4 rounded-2xl p-4 md:p-5">
		<span className="animate-pulse text-sm font-medium text-emerald-800 dark:text-emerald-500">
			Thinking...
		</span>
	</article>
);

export default MessageLoading;
