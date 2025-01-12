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

const Message: React.FC<MessageProps> = ({ content, role }) => {
	const isUser = role === "user";

	return (
		<article
			className={cn(
				"mb-4 flex items-start gap-4 rounded-2xl p-4 md:p-5",
				isUser ? "" : "bg-emerald-50"
			)}
		>
			{isUser ? (
				<Avatar>
					<AvatarFallback>
						<AvatarIcon className="size-10" />
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
