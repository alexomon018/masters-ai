import { INITIAL_QUESTIONS } from "@constants";

interface InitialQuestionsProps {
	onClickQuestion: (value: string) => void;
}

const InitialQuestions = ({ onClickQuestion }: InitialQuestionsProps) => (
	<div className="mt-4 grid gap-2 md:mt-6 md:grid-cols-2 md:gap-4">
		{INITIAL_QUESTIONS.map((message) => (
			<button
				key={message.content}
				type="button"
				className="cursor-pointer select-none rounded-xl border border-gray-200 bg-white p-3 text-left font-normal hover:border-zinc-400 hover:bg-zinc-50 md:px-4 md:py-3"
				onClick={() => onClickQuestion(message.content)}
			>
				{message.content}
			</button>
		))}
	</div>
);

export default InitialQuestions;
