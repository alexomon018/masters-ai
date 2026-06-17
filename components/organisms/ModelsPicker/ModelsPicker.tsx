import {
	Card,
	Button,
	Switch,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuCheckboxItem,
	DropdownMenuTrigger,
	CustomIcon
} from "@atoms";
import {
	CopyIcon,
	EyeIcon,
	WholeWordIcon,
	BrainIcon,
	ZapIcon
} from "lucide-react";
import { useState } from "react";
import { usePostHog } from "@posthog/react";
import { modelCards } from "@constants";
import { useModelStore } from "@providers";

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
	const {
		selectedFeatures,
		setSelectedFeatures,
		clearFeatures,
		enabledModels,
		toggleModelEnabled,
		enableAllModels,
		disableAllModels
	} = useModelStore((state) => state);
	const posthog = usePostHog();

	const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

	const toggleDescription = (modelId: string) => {
		setExpandedModels((expanded) => {
			const newExpanded = new Set(expanded);
			if (newExpanded.has(modelId)) {
				newExpanded.delete(modelId);
			} else {
				newExpanded.add(modelId);
			}
			return newExpanded;
		});
	};

	const onCheckedFeature = (checked: boolean, feature: Feature) => {
		setSelectedFeatures(
			checked
				? new Set([...selectedFeatures, feature.name])
				: new Set([...selectedFeatures].filter((f) => f !== feature.name))
		);
	};

	return (
		<div className="mx-auto w-full max-w-4xl p-6">
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">Available Models</h1>
				<p className="text-muted-foreground">
					{`Choose which models appear in your model selector. This won't affect
					existing conversations.`}
				</p>

				<div className="mb-6 flex items-center justify-between">
					<div className="flex items-center gap-2">
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
										<div className="flex items-center gap-2">
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
						<Button variant="secondary" onClick={enableAllModels}>
							Select All
						</Button>
						<Button variant="secondary" onClick={disableAllModels}>
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
								<div className="flex items-start justify-between">
									<div className="flex gap-4">
										<div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-lg">
											<CustomIcon icon={model.icon} />
										</div>
										<div>
											<div className="flex items-center gap-2">
												<h3 className="font-semibold">{model.name}</h3>
											</div>
											<p className="text-sm text-muted-foreground">
												{expandedModels.has(model.id)
													? model.longDescription
													: model.shortDescription}
											</p>
											<Button
												variant="link"
												className="mt-1 h-auto p-0 text-sm"
												onClick={() => toggleDescription(model.id)}
											>
												{expandedModels.has(model.id)
													? "Show less"
													: "Show more"}
											</Button>
											<div className="mt-2 flex gap-3">
												{model.features.map((feature) => (
													<div
														key={feature.name}
														className="flex items-center gap-1 text-sm text-muted-foreground"
													>
														{feature.icon}
														<span>{feature.name}</span>
													</div>
												))}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<CopyIcon className="size-5 text-muted-foreground" />
										<Switch
											checked={enabledModels.has(model.id)}
											onCheckedChange={() => {
												const willEnable = !enabledModels.has(model.id);
												posthog.capture("model_toggled", {
													model_id: model.id,
													model_name: model.name,
													enabled: willEnable
												});
												toggleModelEnabled(model.id);
											}}
										/>
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
