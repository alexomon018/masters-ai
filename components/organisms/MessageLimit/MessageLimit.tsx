import React from "react";
import { useUser } from "@clerk/clerk-react";
import { useMessageLimit } from "./useMessageLimit";

interface MessageLimitDisplayProps {
	className?: string;
}

const MessageLimitDisplay: React.FC<MessageLimitDisplayProps> = ({
	className = ""
}) => {
	const { messageLimit, loading, error } = useMessageLimit();

	const { user } = useUser();

	if (loading) {
		return (
			<div className={`text-sm opacity-75 ${className}`}>
				Loading message limit info...
			</div>
		);
	}

	if (error) {
		return (
			<div className={`text-sm text-red-500 ${className}`}>
				Error: {error instanceof Error ? error.message : String(error)}
			</div>
		);
	}

	if (!messageLimit) {
		return null;
	}

	if (messageLimit.remaining === 0 && !user) {
		return (
			<div className={`text-sm text-amber-500 ${className}`}>
				{`You've reached the message limit. Sign in to get a higher limit (it's free!).`}
			</div>
		);
	}

	if (messageLimit.remaining === 0 && user) {
		return (
			<div className={`text-sm text-amber-500 ${className}`}>
				{`You've reached the message limit. Upgrade to a paid plan to continue.`}
			</div>
		);
	}

	return (
		<div className={`text-sm ${className}`}>
			<p>
				Messages: {messageLimit.used}/{messageLimit.total}
				<span className="ml-2">({messageLimit.remaining} remaining)</span>
			</p>
		</div>
	);
};

export default MessageLimitDisplay;
