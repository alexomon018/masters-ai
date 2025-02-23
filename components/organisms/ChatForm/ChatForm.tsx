import { cn } from "@utils";
import CustomForm from "../CustomForm/CustomForm";

interface ChatFormProps {
	formRef: React.RefObject<HTMLFormElement>;
	onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
	input: string;
	handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	streaming: boolean;
}

const ChatForm = ({
	formRef,
	onSubmit,
	input,
	handleInputChange,
	streaming
}: ChatFormProps) => (
	<div
		className={cn(
			"fixed inset-x-0 bottom-0 z-10",
			"flex items-center justify-center",
			"bg-white",
			"ml-80"
		)}
	>
		<span className="pointer-events-none absolute inset-x-0 bottom-full h-10 bg-gradient-to-b from-white/0 to-white" />
		<div
			className={cn(
				"md:pl-inherit w-full max-w-screen-md rounded-xl px-4 py-6 md:px-5"
			)}
		>
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
		</div>
	</div>
);

export default ChatForm;
