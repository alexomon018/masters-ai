import { Card, Progress } from "@atoms";

interface MessageUsageProps {
	used: number;
	total: number;
	resetsAt: string;
}

const MessageUsage = ({ used, total, resetsAt }: MessageUsageProps) => {
	const percentage =
		total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;
	const remaining = Math.max(0, total - used);

	return (
		<Card className="p-5">
			<div className="mb-3 flex items-baseline justify-between">
				<h3 className="text-base font-medium">Message Usage</h3>
				<span className="text-xs text-muted-foreground">Resets {resetsAt}</span>
			</div>
			<div className="mb-2 flex items-center justify-between text-sm">
				<span>Included models</span>
				<span className="text-muted-foreground">
					{used}/{total}
				</span>
			</div>
			<Progress value={percentage} className="h-2" />
			<p className="mt-2 text-xs text-muted-foreground">
				{remaining} messages remaining
			</p>
		</Card>
	);
};

export default MessageUsage;
