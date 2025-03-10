"use client";

import React from "react";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger
} from "@atoms";
import Image from "next/image";
import { Model, modelCards } from "@constants";
import { useModelStore } from "@providers";

const ChatModelSelector = () => {
	const { selectedModel, selectModel, enabledModels } = useModelStore(
		(state) => state
	);

	// Only show enabled models in the dropdown
	const availableModels = modelCards.filter((model) =>
		enabledModels.has(model.id)
	);

	// Handle null state while loading
	if (!selectedModel) return null;

	return (
		<div className="absolute bottom-3 left-3">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="gap-2 px-2 h-8 hover:bg-transparent focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
					>
						<div className="flex justify-center items-center rounded-lg bg-primary/10 size-6">
							<Image
								src={selectedModel?.logo ?? ""}
								alt={selectedModel?.name ?? ""}
								className="size-4"
							/>
						</div>
						<span className="text-sm font-medium">{selectedModel?.name}</span>
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
							className="gap-2 justify-start px-2 w-full"
							onClick={() => {
								selectModel(model);
							}}
						>
							<div className="flex justify-center items-center rounded-lg bg-primary/10 size-6">
								<Image src={model.logo} alt={model.name} className="size-4" />
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
