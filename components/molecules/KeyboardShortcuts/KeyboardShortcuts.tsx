interface ShortcutProps {
	action: string;
	keys: string[];
}

const Shortcut = ({ action, keys }: ShortcutProps) => (
	<div className="flex items-center justify-between">
		<span className="text-sm">{action}</span>
		<div className="flex gap-1">
			{keys.map((key, index) => (
				<kbd
					key={index}
					className="flex h-5 min-w-[20px] items-center justify-center rounded bg-secondary px-1 text-xs"
				>
					{key}
				</kbd>
			))}
		</div>
	</div>
);

const KeyboardShortcuts = () => {
	const shortcuts = [
		{ action: "Search", keys: ["⌘", "K"] },
		{ action: "New Chat", keys: ["⌘", "⇧", "0"] }
	];

	return (
		<div className="rounded-lg bg-card p-4">
			<h3 className="mb-2 font-medium">Keyboard Shortcuts</h3>
			<div className="space-y-2">
				{shortcuts.map((shortcut) => (
					<Shortcut
						key={shortcut.action}
						action={shortcut.action}
						keys={shortcut.keys}
					/>
				))}
			</div>
		</div>
	);
};

export default KeyboardShortcuts;
