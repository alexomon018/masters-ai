"use client";

import React, { memo, useMemo, useState } from "react";
import Markdown from "markdown-to-jsx";
import cn from "@/utils/cn";
import type { ChatMessage as MessageProps } from "@/components/organisms/Chat/useAskChat";
import { User as UserIcon, ThumbsUp, ThumbsDown } from "lucide-react";
import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from "@/components/atoms/Avatar/Avatar";
import { AvatarIcon } from "@radix-ui/react-icons";
import { useUser } from "@clerk/nextjs";
import CodeBlock from "../CodeBlock/CodeBlock";

interface BaseProps {
	children: React.ReactNode;
}

interface CodeComponentProps extends BaseProps {
	className?: string;
}

const InlineCode: React.FC<BaseProps> = ({ children }) => (
	<code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-sm dark:bg-gray-800">
		{children}
	</code>
);

const OrderedList: React.FC<BaseProps> = ({ children }) => (
	<ol className="list-decimal">{children}</ol>
);

const UnorderedList: React.FC<BaseProps> = ({ children }) => (
	<ol className="list-disc">{children}</ol>
);

const Paragraph: React.FC<BaseProps> = ({ children }) => (
	<div className="my-2">{children}</div>
);

const PreBlock: React.FC<BaseProps> = ({ children }) => (
	<div className="not-prose">{children}</div>
);

const CodeComponent: React.FC<CodeComponentProps> = ({
	children,
	className
}) => {
	if (!className) {
		return <InlineCode>{children}</InlineCode>;
	}
	return <CodeBlock className={className}>{children as string}</CodeBlock>;
};

const Message: React.FC<MessageProps> = ({ content, role }) => {
	const isUser = role === "user";
	const isAssistant = role === "assistant";
	const { user } = useUser();
	const isAnonymous = !user;
	const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

	const markdownOptions = useMemo(
		() => ({
			overrides: {
				p: Paragraph,
				ol: OrderedList,
				ul: UnorderedList,
				code: CodeComponent,
				pre: PreBlock
			}
		}),
		[]
	);

	return (
		<article
			className={cn(
				"mb-4 flex w-full items-start gap-3 rounded-2xl p-3 md:gap-4 md:p-5"
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
			<div className="flex flex-col">
				<Markdown
					className={cn(
						"w-fit max-w-[600px] space-y-4 py-1.5 md:py-1",
						isUser ? "font-semibold" : ""
					)}
					options={markdownOptions}
				>
					{content}
				</Markdown>
				{isAssistant && (
					<div className="mt-2 flex items-center gap-1">
						<button
							type="button"
							onClick={() =>
								setFeedback((prev) => (prev === "up" ? null : "up"))
							}
							className={cn(
								"rounded-lg p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700",
								feedback === "up"
									? "text-green-600 dark:text-green-400"
									: "text-gray-400 dark:text-gray-500"
							)}
							aria-label="Good response"
						>
							<ThumbsUp className="size-4" />
						</button>
						<button
							type="button"
							onClick={() =>
								setFeedback((prev) => (prev === "down" ? null : "down"))
							}
							className={cn(
								"rounded-lg p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700",
								feedback === "down"
									? "text-red-500 dark:text-red-400"
									: "text-gray-400 dark:text-gray-500"
							)}
							aria-label="Bad response"
						>
							<ThumbsDown className="size-4" />
						</button>
					</div>
				)}
			</div>
		</article>
	);
};

export default memo(Message);
