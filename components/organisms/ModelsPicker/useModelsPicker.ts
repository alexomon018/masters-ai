import { useState } from "react";
import { usePostHog } from "@posthog/react";
import { Model } from "@constants";
import { useModelStore } from "@providers";

export const useModelsPicker = () => {
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

	const onCheckedFeature = (checked: boolean, featureName: string) => {
		setSelectedFeatures(
			checked
				? new Set([...selectedFeatures, featureName])
				: new Set([...selectedFeatures].filter((f) => f !== featureName))
		);
	};

	const handleToggleModel = (modelId: Model["id"], modelName: string) => {
		const willEnable = !enabledModels.has(modelId);
		posthog.capture("model_toggled", {
			model_id: modelId,
			model_name: modelName,
			enabled: willEnable
		});
		toggleModelEnabled(modelId);
	};

	return {
		selectedFeatures,
		clearFeatures,
		enabledModels,
		enableAllModels,
		disableAllModels,
		expandedModels,
		toggleDescription,
		onCheckedFeature,
		handleToggleModel
	};
};

export default useModelsPicker;
