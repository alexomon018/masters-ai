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
import { Link } from "@tanstack/react-router";
import { modelCards } from "@constants";
import { useModelsPicker } from "./useModelsPicker";

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
		clearFeatures,
		enabledModels,
		enableAllModels,
		disableAllModels,
		expandedModels,
		toggleDescription,
		onCheckedFeature,
		handleToggleModel,
		connectedProviders
	} = useModelsPicker();

	return (
		<div className="w-full">
			<div className="space-y-4">
				<h1 className="text-xl font-semibold tracking-tight">
					Available Models
				</h1>
				<p className="text-sm text-muted-foreground">
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
										<span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
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
											onCheckedFeature(checked, feature.name);
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
						.map((model) => {
							const locked =
								model.byok === true &&
								!connectedProviders.has(model.provider);
							return (
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
										{locked ? (
											<Link
												to="/settings/$tab"
												params={{ tab: "api-keys" }}
												className="text-sm font-medium text-primary underline-offset-4 hover:underline"
											>
												Connect a key
											</Link>
										) : (
											<>
												<CopyIcon className="size-5 text-muted-foreground" />
												<Switch
													checked={enabledModels.has(model.id)}
													onCheckedChange={() => {
														handleToggleModel(model.id, model.name);
													}}
												/>
											</>
										)}
									</div>
								</div>
							</Card>
							);
						})}
				</div>
			</div>
		</div>
	);
};

export default ModelSelector;
