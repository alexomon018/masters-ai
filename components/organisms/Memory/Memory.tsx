import { useState } from "react";
import {
	Button,
	Card,
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@atoms";
import { X } from "lucide-react";
import { useMemory } from "./useMemory";
import type { MemoryItemDto } from "./memoryApi";

const MemoryRow = ({
	item,
	label,
	pending,
	onForget
}: {
	item: MemoryItemDto;
	label: string;
	pending: boolean;
	onForget: () => void;
}) => (
	<li className="flex items-start justify-between gap-3 rounded-lg border bg-card px-4 py-3">
		<div className="min-w-0">
			<p className="break-words text-sm">{label}</p>
			{item.status === "provisional" && (
				<span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
					Learning — not used yet
				</span>
			)}
		</div>
		<Button
			variant="ghost"
			size="sm"
			className="size-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
			disabled={pending}
			aria-label="Forget this"
			onClick={onForget}
		>
			<X className="size-4" />
		</Button>
	</li>
);

const Section = ({
	title,
	items,
	render,
	pendingId,
	onForget
}: {
	title: string;
	items: MemoryItemDto[];
	render: (item: MemoryItemDto) => string;
	pendingId: string | null;
	onForget: (id: string) => void;
}) => {
	if (items.length === 0) return null;
	return (
		<div className="space-y-2">
			<h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
			<ul className="space-y-2">
				{items.map((item) => (
					<MemoryRow
						key={item.id}
						item={item}
						label={render(item)}
						pending={pendingId === item.id}
						onForget={() => onForget(item.id)}
					/>
				))}
			</ul>
		</div>
	);
};

const Memory = () => {
	const {
		memory,
		isLoading,
		isEmpty,
		forget,
		clearAll,
		pendingId,
		clearing
	} = useMemory();
	const [confirmOpen, setConfirmOpen] = useState(false);

	const renderBody = () => {
		if (isLoading) {
			return <p className="text-sm text-muted-foreground">Loading…</p>;
		}
		if (isEmpty) {
			return (
				<Card className="p-8 text-center text-sm text-muted-foreground">
					Nothing remembered yet. As you chat, masters.chat will note durable
					preferences and facts about you here.
				</Card>
			);
		}
		return (
			<>
				<Section
					title="Preferences"
					items={memory.preferences}
					render={(i) => (i.key ? `${i.key}: ${i.content}` : i.content)}
					pendingId={pendingId}
					onForget={forget}
				/>
				<Section
					title="Facts about you"
					items={memory.facts}
					render={(i) => i.content}
					pendingId={pendingId}
					onForget={forget}
				/>
				<Section
					title="Recent sessions"
					items={memory.episodes}
					render={(i) => i.content}
					pendingId={pendingId}
					onForget={forget}
				/>

				<div className="flex justify-end border-t pt-4">
					<Button
						variant="outline"
						className="text-destructive"
						disabled={clearing}
						onClick={() => setConfirmOpen(true)}
					>
						{clearing ? "Clearing…" : "Clear all memory"}
					</Button>
				</div>
			</>
		);
	};

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="space-y-1">
				<h1 className="text-xl font-semibold tracking-tight">Memory</h1>
				<p className="text-sm text-muted-foreground">
					What masters.chat has learned about you across conversations. It uses
					these to tailor answers. You can forget anything here at any time.
				</p>
			</div>

			{renderBody()}

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="text-destructive">
							Clear all memory
						</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently deletes everything masters.chat has remembered
							about you. This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<Button variant="outline" onClick={() => setConfirmOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={clearing}
							onClick={async () => {
								await clearAll();
								setConfirmOpen(false);
							}}
						>
							{clearing ? "Clearing…" : "Clear all"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default Memory;
