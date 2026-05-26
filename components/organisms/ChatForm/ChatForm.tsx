"use client";

import { MousePointerClick } from "lucide-react";
import { cn } from "@utils";
import { ChatModelSelector, InitialQuestions } from "@molecules";
import MessageLimit from "../MessageLimit/MessageLimit";

interface ChatFormProps {
	formRef: React.RefObject<HTMLFormElement | null>;
	onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
	input: string;
	handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	streaming: boolean;
	showInitialQuestions?: boolean;
	onClickQuestion?: (value: string) => void;
}

const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		const { form } = e.currentTarget;
		form?.dispatchEvent(
			new Event("submit", { cancelable: true, bubbles: true })
		);
	}
};

const ChatForm = ({
	formRef,
	onSubmit,
	input,
	handleInputChange,
	streaming,
	showInitialQuestions,
	onClickQuestion
}: ChatFormProps) => (
	<div className="flex shrink-0 flex-col items-center justify-center">
		<div className="w-full max-w-screen-md rounded-xl px-4 py-3 md:px-5 md:py-6">
			{showInitialQuestions && onClickQuestion && (
				<InitialQuestions onClickQuestion={onClickQuestion} />
			)}
			<form
				ref={formRef}
				onSubmit={onSubmit}
				className="relative m-auto flex flex-col"
			>
				<textarea
					placeholder="Your question..."
					required
					value={input}
					onChange={handleInputChange}
					onKeyDown={handleTextareaKeyDown}
					disabled={streaming}
					className={cn(
						"flex-1 w-full transition outline-none ring-0 resize-none max-h-[200px] overflow-y-auto",
						"min-h-[60px] rounded-t-2xl border-2 border-b-0 border-gray-300 p-4 text-base",
						"focus:border-gray-300 disabled:bg-gray-100",
						"md:min-h-[80px] md:p-5",
						"dark:bg-[#2D2D2D]"
					)}
				/>
				<div
					className={cn(
						"flex items-center justify-between rounded-b-2xl border-2 border-t-0 border-gray-300 bg-white px-3 py-2",
						"dark:bg-[#2D2D2D]"
					)}
				>
					<ChatModelSelector />
					<button
						type="submit"
						tabIndex={-1}
						disabled={streaming}
						className={cn(
							streaming
								? "opacity-30"
								: "opacity-50 hover:opacity-100"
						)}
					>
						<MousePointerClick className="size-7 rotate-90" />
					</button>
				</div>
			</form>
			<MessageLimit className="flex justify-center pt-1 text-xs opacity-60" />
		</div>
	</div>
);

export default ChatForm;
