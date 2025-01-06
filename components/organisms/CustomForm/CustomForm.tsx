import { ComponentProps, forwardRef } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { cn } from "@utils";

export interface Props extends ComponentProps<"form"> {
	inputProps: ComponentProps<"input">;
	buttonProps: ComponentProps<"button">;
}

const Form = (
	{ inputProps, buttonProps, onSubmit }: Props,
	ref: React.Ref<HTMLFormElement>
) => (
	<form
		onSubmit={onSubmit}
		className="relative m-auto flex items-center justify-center gap-4"
		ref={ref}
	>
		<input
			placeholder="Your question..."
			required
			{...inputProps}
			className={cn(
				"h-10 flex-1 rounded-xl pl-4 pr-12 transition md:h-12",
				"border border-gray-400 text-base",
				"disabled:bg-gray-100",
				inputProps.className
			)}
			type="text"
		/>

		<button
			{...buttonProps}
			type="submit"
			tabIndex={-1}
			className={cn("absolute right-3 top-1/2 -translate-y-1/2", "opacity-50")}
		>
			<ArrowRightIcon />
		</button>
	</form>
);

export default forwardRef(Form);
