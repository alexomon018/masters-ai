import { cn } from "@utils";
import { InitialQuestions } from "@molecules";
import CustomForm from "../CustomForm/CustomForm";
import MessageLimit from "../MessageLimit/MessageLimit";

interface ChatFormProps {
	formRef: React.RefObject<HTMLFormElement>;
	onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
	input: string;
	handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	streaming: boolean;
	showInitialQuestions?: boolean;
	onClickQuestion?: (value: string) => void;
}

const ChatForm = ({
	formRef,
	onSubmit,
	input,
	handleInputChange,
	streaming,
	showInitialQuestions,
	onClickQuestion
}: ChatFormProps) => (
	<div
		className={cn(
			"shrink-0",
			"flex flex-col items-center justify-center"
		)}
	>
		<div
			className={cn(
				"w-full max-w-screen-md rounded-xl px-4 py-3 md:px-5 md:py-6"
			)}
		>
			{showInitialQuestions && onClickQuestion && (
				<InitialQuestions onClickQuestion={onClickQuestion} />
			)}
			<CustomForm
				ref={formRef}
				onSubmit={onSubmit}
				inputProps={{
					disabled: streaming,
					value: input,
					onChange: handleInputChange
				}}
				buttonProps={{
					disabled: streaming
				}}
			/>
			<MessageLimit className="flex justify-center pt-1 text-xs opacity-60" />
		</div>
	</div>
);

export default ChatForm;
