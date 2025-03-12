import { ArrowRight } from "lucide-react";

interface QuestionCardProps {
	question: string;
	askedBy: number;
}

const QuestionCard = ({ question, askedBy }: QuestionCardProps) => (
	<div className="flex justify-between items-center p-4 rounded-xl transition-colors cursor-pointer group bg-white/50 hover:bg-white/80">
		<div className="flex gap-4 justify-between mb-4">
			<h3 className="font-medium">{question}</h3>
			<ArrowRight className="transition-colors size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
		</div>
		<p className="text-sm text-muted-foreground">
			Asked by {askedBy} {askedBy === 1 ? "person" : "people"}
		</p>
	</div>
);

export default QuestionCard;
