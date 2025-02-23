import { Progress } from "@atoms";

interface MessageUsageProps {
	used: number;
	total: number;
	resetsAt: string;
}

export default function MessageUsage({
	used,
	total,
	resetsAt
}: MessageUsageProps) {
	const percentage = (used / total) * 100;

	return (
		<div className="rounded-lg bg-card p-4">
			<h3 className="font-medium">Message Usage</h3>
			<p className="mb-2 text-xs text-muted-foreground">Resets {resetsAt}</p>
			<div className="mb-2 flex items-center justify-between text-sm">
				<span>Standard</span>
				<span>
					{used}/{total}
				</span>
			</div>
			<Progress value={percentage} className="h-2" />
			<p className="mt-2 text-xs text-muted-foreground">
				{total - used} messages remaining
			</p>
		</div>
	);
}
