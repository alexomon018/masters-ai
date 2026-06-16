import { useLayoutEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown } from "lucide-react";
import { MessageLoader } from "@atoms";
import cn from "@/utils/cn";
import type { FeedbackEntry } from "@/components/organisms/Chat/helpers";
import Message from "../Message/Message";

interface MessageListProps {
	messages: UIMessage[];
	loading: boolean;
	streaming: boolean;
	threadId: string;
	feedbackMap: Record<string, FeedbackEntry>;
}

const MessageList = ({
	messages,
	loading,
	streaming,
	threadId,
	feedbackMap
}: MessageListProps) => {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [atEnd, setAtEnd] = useState(true);

	const virtualizer = useVirtualizer({
		count: messages.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => 120,
		getItemKey: (index) => messages[index].id,
		anchorTo: "end",
		followOnAppend: streaming ? "smooth" : true,
		scrollEndThreshold: 80,
		overscan: 6,
		onChange: (instance) => setAtEnd(instance.isAtEnd())
	});

	useLayoutEffect(() => {
		virtualizer.scrollToEnd();
	}, [virtualizer, messages.length]);

	const items = virtualizer.getVirtualItems();

	return (
		<div
			ref={scrollRef}
			className="scrollbar-hide relative flex-1 overflow-y-auto overflow-x-hidden"
		>
			<div
				className="relative w-full"
				style={{ height: `${virtualizer.getTotalSize()}px` }}
			>
				{items.map((item) => (
					<div
						key={item.key}
						ref={virtualizer.measureElement}
						data-index={item.index}
						className="absolute left-0 top-0 w-full pb-4"
						style={{ transform: `translateY(${item.start}px)` }}
					>
						<Message
							message={messages[item.index]}
							threadId={threadId}
							initialFeedback={feedbackMap[messages[item.index].id]}
						/>
					</div>
				))}
			</div>

			{loading && <MessageLoader />}

			{!atEnd && (
				<button
					type="button"
					onClick={() =>
						virtualizer.scrollToIndex(messages.length - 1, {
							align: "end",
							behavior: "smooth"
						})
					}
					className={cn(
						"sticky bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5",
						"rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-md",
						"dark:border-gray-700 dark:bg-gray-900"
					)}
				>
					<ArrowDown className="size-4" />
					Latest
				</button>
			)}
		</div>
	);
};

export default MessageList;
