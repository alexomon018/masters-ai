"use client";

import {
	Card,
	Button,
	Switch,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuCheckboxItem,
	DropdownMenuTrigger
} from "@atoms";
import {
	CopyIcon,
	EyeIcon,
	WholeWordIcon,
	BrainIcon,
	ZapIcon
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { modelCards } from "@constants";

type Feature = {
	name: string;
	icon: React.ReactNode;
};

const availableFeatures: Feature[] = [
	{
		name: "Fast",
		icon: <ZapIcon className="size-4" color="#FF9800" />
	},
	{
		name: "Vision",
		icon: <EyeIcon className="size-4" color="blue" />
	},
	{
		name: "Search",
		icon: <WholeWordIcon className="size-4" color="green" />
	},
	{
		name: "Reasoning",
		icon: <BrainIcon className="size-4" color="purple" />
	}
];

const ModelSelector = () => {
	const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
	const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(
		new Set()
	);

	const toggleDescription = (modelId: string) => {
		const newExpanded = new Set(expandedModels);
		if (newExpanded.has(modelId)) {
			newExpanded.delete(modelId);
		} else {
			newExpanded.add(modelId);
		}
		setExpandedModels(newExpanded);
	};

	const onCheckedFeature = (checked: boolean, feature: Feature) => {
		const newFeatures = new Set(selectedFeatures);
		if (checked) {
			newFeatures.add(feature.name);
		} else {
			newFeatures.delete(feature.name);
		}
		setSelectedFeatures(newFeatures);
	};

	const onSelectAll = () =>
		setSelectedFeatures(
			new Set(availableFeatures.map((feature) => feature.name))
		);

	const onUnselectAll = () => setSelectedFeatures(new Set());

	const clearFeatures = () => {
		setSelectedFeatures(new Set());
	};

	return (
		<div className="p-6 mx-auto w-full max-w-4xl">
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">Available Models</h1>
				<p className="text-muted-foreground">
					{`Choose which models appear in your model selector. This won't affect
					existing conversations.`}
				</p>

				<div className="flex justify-between items-center mb-6">
					<div className="flex gap-2 items-center">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									className="w-[200px] justify-between outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
								>
									<span>Filter by features</span>
									{selectedFeatures.size > 0 && (
										<span className="ml-2 rounded-full bg-teal-400 px-2 py-0.5 text-xs font-medium">
											{selectedFeatures.size}
										</span>
									)}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-[200px]">
								{availableFeatures.map((feature) => (
									<DropdownMenuCheckboxItem
										key={feature.name}
										checked={selectedFeatures.has(feature.name)}
										onCheckedChange={(checked) => {
											onCheckedFeature(checked, feature);
										}}
									>
										<div className="flex gap-2 items-center">
											{feature.icon}
											<span>{feature.name}</span>
										</div>
									</DropdownMenuCheckboxItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
						{selectedFeatures.size > 0 && (
							<Button
								variant="ghost"
								size="icon"
								className="ml-2 size-8"
								onClick={clearFeatures}
							>
								Clear
							</Button>
						)}
					</div>
					<div className="space-x-2">
						<Button variant="secondary" onClick={onSelectAll}>
							Select All
						</Button>
						<Button variant="secondary" onClick={onUnselectAll}>
							Unselect All
						</Button>
					</div>
				</div>

				<div className="space-y-4">
					{modelCards
						.filter(
							(model) =>
								selectedFeatures.size === 0 ||
								model.features.some((feature) =>
									selectedFeatures.has(feature.name)
								)
						)
						.map((model) => (
							<Card key={model.id} className="p-6">
								<div className="flex justify-between items-start">
									<div className="flex gap-4">
										<div className="flex justify-center items-center rounded-lg bg-primary/10 size-12 shrink-0">
											<Image src={model.logo} alt={model.name} />
										</div>
										<div>
											<div className="flex gap-2 items-center">
												<h3 className="font-semibold">{model.name}</h3>
											</div>
											<p className="text-sm text-muted-foreground">
												{expandedModels.has(model.id)
													? model.longDescription
													: model.shortDescription}
											</p>
											<Button
												variant="link"
												className="p-0 mt-1 h-auto text-sm"
												onClick={() => toggleDescription(model.id)}
											>
												{expandedModels.has(model.id)
													? "Show less"
													: "Show more"}
											</Button>
											<div className="flex gap-3 mt-2">
												{model.features.map((feature) => (
													<div
														key={feature.name}
														className="flex gap-1 items-center text-sm text-muted-foreground"
													>
														{feature.icon}
														<span>{feature.name}</span>
													</div>
												))}
											</div>
										</div>
									</div>
									<div className="flex gap-4 items-center">
										<CopyIcon className="size-5 text-muted-foreground" />
										<Switch />
									</div>
								</div>
							</Card>
						))}
				</div>
			</div>
		</div>
	);
};

export default ModelSelector;
