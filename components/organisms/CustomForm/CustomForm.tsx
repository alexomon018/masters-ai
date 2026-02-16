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
		icon = <MousePointerClick className="size-7 rotate-90" />,
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
			"flex-1 w-full transition focus-outline-none outline-none ring-0 dark:bg-[#2D2D2D] resize-none max-h-[200px] overflow-y-auto";

		switch (variant) {
			case "modern":
				return cn(
					baseStyles,
					"min-h-[60px] rounded-t-2xl p-4 md:min-h-[80px] md:p-5",
					"border-2 border-b-0 border-gray-300 text-base focus:border-gray-300 focus-outline-none",
					"disabled:bg-gray-100",
					inputProps.className
				);
			case "minimal":
				return cn(
					baseStyles,
					"min-h-[60px] rounded-t-lg bg-transparent p-3 md:min-h-[80px]",
					"border-b-2 border-gray-300 text-base focus:border-primary",
					"disabled:bg-gray-100/50",
					inputProps.className
				);
			default:
				return cn(
					baseStyles,
					"min-h-[60px] rounded-t-xl p-4 pt-1 md:min-h-[80px]",
					"border border-b-0 border-gray-400 text-base",
					"disabled:bg-gray-100",
					inputProps.className
				);
		}
	};

	const getToolbarStyles = () => {
		switch (variant) {
			case "modern":
				return "rounded-b-2xl border-2 border-t-0 border-gray-300 bg-white px-3 py-2 dark:bg-[#2D2D2D]";
			case "minimal":
				return "rounded-b-lg bg-transparent px-3 py-2";
			default:
				return "rounded-b-xl border border-t-0 border-gray-400 bg-white px-3 py-2 dark:bg-[#2D2D2D]";
		}
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
			className={cn("relative m-auto flex flex-col")}
			ref={ref}
			{...formProps}
		>
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

			<div
				className={cn("flex items-center justify-between", getToolbarStyles())}
			>
				<ChatModelSelector />

				<button
					{...buttonProps}
					type="submit"
					tabIndex={-1}
					className={cn(
						isLoading ? "opacity-30" : "opacity-50 hover:opacity-100",
						buttonProps.className
					)}
					disabled={isLoading || buttonProps.disabled}
				>
					{isLoading ? (
						<span className="flex items-center justify-center">
							<svg className="size-5 animate-spin" viewBox="0 0 24 24">
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
