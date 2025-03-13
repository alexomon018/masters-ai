import { INITIAL_QUESTIONS } from "@constants";

interface InitialQuestionsProps {
	onClickQuestion: (value: string) => void;
}

const InitialQuestions = ({ onClickQuestion }: InitialQuestionsProps) => (
	<div className="grid gap-2 mt-4 md:mt-6 md:grid-cols-2 md:gap-4">
		{INITIAL_QUESTIONS.map((message) => (
			<button
				key={message.content}
				type="button"
				className="p-3 font-normal text-left rounded-xl border border-gray-200 cursor-pointer select-none hover:border-zinc-400 hover:bg-zinc-50 md:px-4 md:py-3"
				onClick={() => onClickQuestion(message.content)}
			>
				{message.content}
			</button>
		))}
	</div>
);

export default InitialQuestions;
