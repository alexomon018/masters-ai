"use client";

import React, { useState } from "react";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	CustomIcon
} from "@atoms";
import { Model, modelCards } from "@constants";
import { useModelStore } from "@providers";

const ChatModelSelector = () => {
	const { selectedModel, selectModel, enabledModels } = useModelStore(
		(state) => state
	);
	const [open, setOpen] = useState(false);

	const availableModels = modelCards.filter(
		(model) => enabledModels.has(model.id) || model.id === modelCards[0].id
	);

	const onModelSelect = (model: Model) => {
		selectModel(model);
		setOpen(false);
	};

	return (
		<div>
			<DropdownMenu open={open} onOpenChange={setOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="h-8 gap-2 px-2 hover:bg-transparent focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
					>
						<div className="bg-primary/10 flex size-6 items-center justify-center rounded-lg">
							<CustomIcon icon={selectedModel.icon} />
						</div>
						<span className="text-sm font-medium">{selectedModel.name}</span>
						<svg
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
							className="opacity-50"
						>
							<path d="M6 8.5L3 5.5H9L6 8.5Z" fill="currentColor" />
						</svg>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-[200px]">
					{availableModels.map((model: Model) => (
						<Button
							key={model.id}
							variant="ghost"
							className="w-full justify-start gap-2 px-2"
							onClick={() => onModelSelect(model)}
						>
							<div className="bg-primary/10 flex size-6 items-center justify-center rounded-lg">
								<CustomIcon icon={model.icon} />
							</div>
							<span className="text-sm font-medium">{model.name}</span>
						</Button>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
};

export default ChatModelSelector;
