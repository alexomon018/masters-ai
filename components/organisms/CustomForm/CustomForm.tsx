"use client";

import { ComponentProps, forwardRef, ReactNode } from "react";
import { MousePointerClick } from "lucide-react";
import { cn } from "@utils";
import { ChatModelSelector } from "@molecules";

export interface Props extends ComponentProps<"form"> {
	inputProps: ComponentProps<"textarea">;
	buttonProps: ComponentProps<"button">;
	icon?: ReactNode;
	buttonPosition?: "inside" | "outside";
	isLoading?: boolean;
	variant?: "default" | "modern" | "minimal";
	children?: ReactNode;
	onModelChange?: (modelId: string) => void;
}

const Form = (
	{
		inputProps,
		buttonProps,
		onSubmit,
		icon = <MousePointerClick className="rotate-90 size-7" />,
		buttonPosition = "inside",
		isLoading = false,
		variant = "modern",
		children,
		onModelChange,
		...formProps
	}: Props,
	ref: React.Ref<HTMLFormElement>
) => {
	// Determine styles based on variant
	const getInputStyles = () => {
		const baseStyles =
			"flex-1 w-full transition focus-outline-none outline-none ring-0 dark:bg-[#2D2D2D] !pt-[12px] resize-none";

		switch (variant) {
			case "modern":
				return cn(
					baseStyles,
					"min-h-[80px] rounded-2xl p-4 md:min-h-[100px] md:p-5",
					"border-2 border-gray-300 text-base focus:border-gray-300 focus-outline-none",
					"disabled:bg-gray-100",
					inputProps.className
				);
			case "minimal":
				return cn(
					baseStyles,
					"min-h-[80px] rounded-lg bg-transparent p-3 md:min-h-[100px]",
					"border-b-2 border-gray-300 text-base focus:border-primary",
					"disabled:bg-gray-100/50",
					inputProps.className
				);
			default:
				return cn(
					baseStyles,
					"min-h-[80px] rounded-xl  p-4 pt-1 md:min-h-[100px]",
					"border border-gray-400 text-base",
					"disabled:bg-gray-100",
					inputProps.className
				);
		}
	};

	const getButtonStyles = () => {
		if (buttonPosition === "outside") {
			return cn(
				"h-10 md:h-12 px-4 rounded-xl ml-2",
				"bg-primary text-white hover:bg-primary/90",
				"disabled:bg-gray-300",
				buttonProps.className
			);
		}

		return cn(
			"absolute right-5 bottom-5",
			isLoading ? "opacity-30" : "opacity-50 hover:opacity-100",
			buttonProps.className
		);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			const { form } = e.currentTarget;
			form?.dispatchEvent(
				new Event("submit", { cancelable: true, bubbles: true })
			);
		}
	};

	return (
		<form
			onSubmit={onSubmit}
			className={cn("flex relative flex-col gap-4 m-auto")}
			ref={ref}
			{...formProps}
		>
			<div className="relative">
				<textarea
					placeholder="Your question..."
					required
					{...inputProps}
					onKeyDown={(e) => {
						handleKeyDown(e);
						inputProps.onKeyDown?.(e);
					}}
					className={cn(getInputStyles())}
					disabled={isLoading || inputProps.disabled}
				/>

				<ChatModelSelector />

				<button
					{...buttonProps}
					type="submit"
					tabIndex={-1}
					className={getButtonStyles()}
					disabled={isLoading || buttonProps.disabled}
				>
					{isLoading ? (
						<span className="flex justify-center items-center">
							<svg className="animate-spin size-5" viewBox="0 0 24 24">
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
									fill="none"
								/>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
						</span>
					) : (
						icon
					)}
				</button>
			</div>
			{children && <div className="mt-2">{children}</div>}
		</form>
	);
};

export default forwardRef(Form);
