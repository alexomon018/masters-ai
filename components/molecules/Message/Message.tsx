import React from "react";
import Markdown from "markdown-to-jsx";
import cn from "@/utils/cn";
import { Message as MessageProps } from "ai/react";
import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from "@/components/atoms/Avatar/Avatar";
import { AvatarIcon } from "@radix-ui/react-icons";
import { useUser } from "@clerk/nextjs";

const Message: React.FC<MessageProps> = ({ content, role }) => {
	const isUser = role === "user";
	const { user } = useUser();

	return (
		<article
			className={cn(
				"flex gap-4 items-start p-4 mb-4 rounded-2xl md:p-5",
				isUser ? "":"bg-emerald-50 dark:bg-emerald-900"
			)}
		>
			{isUser ? (
				<Avatar>
					<AvatarImage src={user?.imageUrl} alt="User avatar" />
					<AvatarFallback>
						{user?.fullName?.charAt(0) || user?.username?.charAt(0)}
					</AvatarFallback>
				</Avatar>
			) : (
				<Avatar className="rounded-none">
					<AvatarImage
						src="https://frontendmasters.com/static-assets/core/m-transparent.webp"
						alt="@masters"
						width={50}
						height={50}
					/>
					<AvatarFallback>
						<AvatarIcon className="size-10" />
					</AvatarFallback>
				</Avatar>
			)}
			<Markdown
				className={cn(
					"space-y-4 py-1.5 md:py-1",
					isUser ? "font-semibold" : ""
				)}
				options={{
					overrides: {
						// eslint-disable-next-line react/no-unstable-nested-components
						ol: ({ children }) => <ol className="list-decimal">{children}</ol>,
						// eslint-disable-next-line react/no-unstable-nested-components
						ul: ({ children }) => <ol className="list-disc">{children}</ol>
					}
				}}
			>
				{content}
			</Markdown>
		</article>
	);
};

export default Message;
