import React from "react";
import Markdown from "markdown-to-jsx";
import cn from "@/utils/cn";
import { Message as MessageProps } from "ai/react";
import { User as UserIcon } from "lucide-react";
import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from "@/components/atoms/Avatar/Avatar";
import { AvatarIcon } from "@radix-ui/react-icons";
import { useUser } from "@clerk/nextjs";
import CodeBlock from "../CodeBlock/CodeBlock";

const Message: React.FC<MessageProps> = ({ content, role }) => {
	const isUser = role === "user";
	const { user } = useUser();
	const isAnonymous = !user;

	return (
		<article
			className={cn(
				"mb-4 flex w-full items-start gap-4 rounded-2xl p-4 md:p-5"
			)}
		>
			{isUser ? (
				<div>
					{isAnonymous ? (
						<UserIcon className="size-10" />
					) : (
						<Avatar>
							<AvatarImage src={user?.imageUrl} alt="User avatar" />
							<AvatarFallback>
								{user?.fullName?.charAt(0) || user?.username?.charAt(0)}
							</AvatarFallback>
						</Avatar>
					)}
				</div>
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
					"w-fit max-w-[600px] space-y-4 py-1.5 md:py-1",
					isUser ? "font-semibold" : ""
				)}
				options={{
					overrides: {
						// eslint-disable-next-line react/no-unstable-nested-components
						ol: ({ children }) => <ol className="list-decimal">{children}</ol>,
						// eslint-disable-next-line react/no-unstable-nested-components
						ul: ({ children }) => <ol className="list-disc">{children}</ol>,
						// eslint-disable-next-line react/no-unstable-nested-components
						code: ({ children, className }) => {
							// For inline code (no language specified)
							if (!className) {
								return (
									<code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-sm dark:bg-gray-800">
										{children}
									</code>
								);
							}
							return (
								<CodeBlock className={className}>
									{children as string}
								</CodeBlock>
							);
						},
						// eslint-disable-next-line react/no-unstable-nested-components
						pre: ({ children }) => <div className="not-prose">{children}</div>
					}
				}}
			>
				{content}
			</Markdown>
		</article>
	);
};

export default Message;
