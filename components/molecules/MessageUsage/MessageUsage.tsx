import { Card, Progress } from "@atoms";

interface MessageUsageProps {
	used: number;
	total: number;
	resetsAt: string;
}

const MessageUsage = ({ used, total, resetsAt }: MessageUsageProps) => {
	const percentage = (used / total) * 100;

	return (
		<Card className="p-5">
			<div className="mb-3 flex items-baseline justify-between">
				<h3 className="text-base font-medium">Message Usage</h3>
				<span className="text-xs text-muted-foreground">Resets {resetsAt}</span>
			</div>
			<div className="mb-2 flex items-center justify-between text-sm">
				<span>Standard</span>
				<span className="text-muted-foreground">
					{used}/{total}
				</span>
			</div>
			<Progress value={percentage} className="h-2" />
			<p className="mt-2 text-xs text-muted-foreground">
				{total - used} messages remaining
			</p>
		</Card>
	);
};

export default MessageUsage;
