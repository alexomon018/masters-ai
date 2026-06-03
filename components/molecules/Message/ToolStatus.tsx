import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import cn from "@/utils/cn";

interface ToolStatusProps {
	name: string;
	status: "running" | "complete" | "error";
}

const ToolStatus = ({ name, status }: ToolStatusProps) => (
	<div
		className={cn(
			"my-1 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono",
			status === "running" &&
				"border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300",
			status === "complete" &&
				"border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
			status === "error" &&
				"border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
		)}
	>
		{status === "running" && (
			<Loader2 className="size-3.5 animate-spin" aria-hidden />
		)}
		{status === "complete" && (
			<CheckCircle2 className="size-3.5" aria-hidden />
		)}
		{status === "error" && <XCircle className="size-3.5" aria-hidden />}
		<span>{name}</span>
	</div>
);

export default ToolStatus;
