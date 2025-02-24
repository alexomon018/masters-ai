import { ComponentProps, forwardRef, ReactNode } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { cn } from "@utils";

export interface Props extends ComponentProps<"form"> {
	inputProps: ComponentProps<"input">;
	buttonProps: ComponentProps<"button">;
	icon?: ReactNode;
	buttonPosition?: "inside" | "outside";
	isLoading?: boolean;
	variant?: "default" | "modern" | "minimal";
}

const Form = (
	{
		inputProps,
		buttonProps,
		onSubmit,
		icon = <ArrowRightIcon />,
		buttonPosition = "inside",
		isLoading = false,
		variant = "modern",
		...formProps
	}: Props,
	ref: React.Ref<HTMLFormElement>
) => {
	// Determine styles based on variant
	const getInputStyles = () => {
		const baseStyles = "flex-1 transition";

		switch (variant) {
			case "modern":
				return cn(
					baseStyles,
					"h-12 rounded-full bg-white pl-5 pr-14 md:h-14",
					"border-2 border-gray-300 text-base focus:border-primary focus:ring-2 focus:ring-primary/20",
					"disabled:bg-gray-100",
					inputProps.className
				);
			case "minimal":
				return cn(
					baseStyles,
					"h-10 rounded-lg bg-transparent pl-3 pr-10 md:h-12",
					"border-b-2 border-gray-300 text-base focus:border-primary",
					"disabled:bg-gray-100/50",
					inputProps.className
				);
			default:
				return cn(
					baseStyles,
					"h-10 rounded-xl bg-white pl-4 pr-12 md:h-12",
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
			"absolute right-3 top-1/2 -translate-y-1/2",
			isLoading ? "opacity-30" : "opacity-50 hover:opacity-100",
			buttonProps.className
		);
	};

	return (
		<form
			onSubmit={onSubmit}
			className={cn(
				"relative m-auto flex items-center gap-4",
				buttonPosition === "outside" ? "justify-between" : "justify-center"
			)}
			ref={ref}
			{...formProps}
		>
			<input
				placeholder="Your question..."
				required
				{...inputProps}
				className={getInputStyles()}
				type={inputProps.type || "text"}
				disabled={isLoading || inputProps.disabled}
			/>

			<button
				{...buttonProps}
				type="submit"
				tabIndex={-1}
				className={getButtonStyles()}
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
		</form>
	);
};

export default forwardRef(Form);
