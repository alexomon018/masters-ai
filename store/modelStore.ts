import { create } from "zustand";
import { Model, modelCards } from "@constants";
import { persist } from "zustand/middleware";

export type ModelState = {
	selectedModel: Model;
	enabledModels: Set<Model["id"]>;
	selectedFeatures: Set<string>;
};

export type ModelActions = {
	selectModel: (model: Model) => void;
	toggleModelEnabled: (modelId: Model["id"]) => void;
	setSelectedFeatures: (features: Set<string>) => void;
	clearFeatures: () => void;
	enableAllModels: () => void;
	disableAllModels: () => void;
};

export type ModelStore = ModelState & ModelActions;

export const defaultInitState: ModelState = {
	selectedModel: modelCards[0],
	enabledModels: new Set(modelCards.map((model) => model.id)),
	selectedFeatures: new Set()
};

export const createModelStore = (initState: ModelState = defaultInitState) =>
	create<ModelStore>()(
		persist(
			(set) => ({
				...initState,
				selectModel: (model) =>
					set((state) => {
						if (
							state.enabledModels.has(model.id) ||
							model.id === modelCards[0].id
						) {
							return { selectedModel: model };
						}
						return state;
					}),
				toggleModelEnabled: (modelId) =>
					set((state) => {
						const newEnabled = new Set(state.enabledModels);
						if (newEnabled.has(modelId)) {
							newEnabled.delete(modelId);

							if (state.selectedModel.id === modelId) {
								const firstEnabledModel =
									modelCards.find(
										(model) => model.id !== modelId && newEnabled.has(model.id)
									) || modelCards[0];
								return {
									enabledModels: newEnabled,
									selectedModel: firstEnabledModel
								};
							}
						} else {
							newEnabled.add(modelId);
						}
						return { enabledModels: newEnabled };
					}),
				setSelectedFeatures: (features) => set({ selectedFeatures: features }),
				clearFeatures: () => set({ selectedFeatures: new Set() }),
				enableAllModels: () =>
					set({ enabledModels: new Set(modelCards.map((model) => model.id)) }),
				disableAllModels: () =>
					set({
						enabledModels: new Set(),
						selectedModel: modelCards[0]
					})
			}),
			{
				name: "model-store",
				storage: {
					getItem: (name) => {
						const str = localStorage.getItem(name);
						if (!str) return null;
						const data = JSON.parse(str);
						return {
							...data,
							state: {
								...data.state,
								enabledModels: new Set(data.state.enabledModels),
								selectedFeatures: new Set(data.state.selectedFeatures)
							}
						};
					},
					setItem: (name, value) => {
						localStorage.setItem(
							name,
							JSON.stringify({
								...value,
								state: {
									...value.state,
									enabledModels: Array.from(value.state.enabledModels),
									selectedFeatures: Array.from(value.state.selectedFeatures)
								}
							})
						);
					},
					removeItem: (name) => localStorage.removeItem(name)
				}
			}
		)
	);
