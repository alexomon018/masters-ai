import React from "react";
import { useMessageLimit } from "./useMessageLimit";

interface MessageLimitDisplayProps {
	className?: string;
}

const MessageLimitDisplay: React.FC<MessageLimitDisplayProps> = ({
	className = ""
}) => {
	const { messageLimit, loading, error } = useMessageLimit();

	if (loading) {
		return (
			<div className={`text-sm opacity-75 ${className}`}>
				Loading message limit info...
			</div>
		);
	}

	if (error) {
		return (
			<div className={`text-sm text-red-500 ${className}`}>Error: {error}</div>
		);
	}

	if (!messageLimit) {
		return null;
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
