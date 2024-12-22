import { ArrowRight } from "lucide-react";

interface QuestionCardProps {
	question: string;
	askedBy: number;
}

const QuestionCard = ({ question, askedBy }: QuestionCardProps) => (
	<div className="group flex cursor-pointer items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80">
		<div className="mb-4 flex justify-between gap-4">
			<h3 className="font-medium">{question}</h3>
			<ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
		</div>
		<p className="text-sm text-muted-foreground">
			Asked by {askedBy} {askedBy === 1 ? "person" : "people"}
		</p>
	</div>
);

export default QuestionCard;
