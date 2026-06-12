import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { modelCards } from "@constants";
import { createModelStore } from "./modelStore";

function installMemoryStorage() {
	const map = new Map<string, string>();
	const storage = {
		getItem: (k: string) => map.get(k) ?? null,
		setItem: (k: string, v: string) => map.set(k, v),
		removeItem: (k: string) => map.delete(k),
		clear: () => map.clear(),
		key: (i: number) => Array.from(map.keys())[i] ?? null,
		get length() {
			return map.size;
		}
	};
	vi.stubGlobal("localStorage", storage);
	return { map, storage };
}

const HAIKU = modelCards[0];
const SONNET = modelCards[1];

beforeEach(() => {
	installMemoryStorage();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("createModelStore defaults", () => {
	it("starts with the first card selected and all models enabled", () => {
		const store = createModelStore();
		const state = store.getState();
		expect(state.selectedModel.id).toBe(HAIKU.id);
		expect(state.enabledModels.size).toBe(modelCards.length);
	});
});

describe("selectModel", () => {
	it("selects a model that is enabled", () => {
		const store = createModelStore();
		store.getState().selectModel(SONNET);
		expect(store.getState().selectedModel.id).toBe(SONNET.id);
	});

	it("keeps the previous selection when the model is disabled (and not the default)", () => {
		const store = createModelStore();
		store.getState().toggleModelEnabled(SONNET.id);
		store.getState().selectModel(SONNET);
		expect(store.getState().selectedModel.id).toBe(HAIKU.id);
	});

	it("always allows selecting the default model even if disabled", () => {
		const store = createModelStore();
		store.getState().selectModel(SONNET);
		store.getState().toggleModelEnabled(HAIKU.id); // disable default
		store.getState().selectModel(HAIKU);
		expect(store.getState().selectedModel.id).toBe(HAIKU.id);
	});
});

describe("toggleModelEnabled", () => {
	it("removes an enabled model from the set", () => {
		const store = createModelStore();
		store.getState().toggleModelEnabled(SONNET.id);
		expect(store.getState().enabledModels.has(SONNET.id)).toBe(false);
	});

	it("re-adds a disabled model", () => {
		const store = createModelStore();
		store.getState().toggleModelEnabled(SONNET.id);
		store.getState().toggleModelEnabled(SONNET.id);
		expect(store.getState().enabledModels.has(SONNET.id)).toBe(true);
	});

	it("falls back to another enabled model when the selected one is disabled", () => {
		const store = createModelStore();
		store.getState().selectModel(SONNET);
		store.getState().toggleModelEnabled(SONNET.id);
		const { selectedModel, enabledModels } = store.getState();
		expect(enabledModels.has(SONNET.id)).toBe(false);
		expect(selectedModel.id).not.toBe(SONNET.id);
		expect(enabledModels.has(selectedModel.id) || selectedModel.id === HAIKU.id).toBe(
			true
		);
	});
});

describe("enableAllModels / disableAllModels", () => {
	it("enableAllModels restores the full set", () => {
		const store = createModelStore();
		store.getState().disableAllModels();
		store.getState().enableAllModels();
		expect(store.getState().enabledModels.size).toBe(modelCards.length);
	});

	it("disableAllModels empties the set and resets selection to the default", () => {
		const store = createModelStore();
		store.getState().selectModel(SONNET);
		store.getState().disableAllModels();
		const state = store.getState();
		expect(state.enabledModels.size).toBe(0);
		expect(state.selectedModel.id).toBe(HAIKU.id);
	});
});

describe("feature selection", () => {
	it("sets and clears selected features", () => {
		const store = createModelStore();
		store.getState().setSelectedFeatures(new Set(["a", "b"]));
		expect(store.getState().selectedFeatures.has("a")).toBe(true);
		store.getState().clearFeatures();
		expect(store.getState().selectedFeatures.size).toBe(0);
	});
});

describe("persistence (Set <-> Array serializer)", () => {
	it("writes enabledModels as an array and rehydrates it as a Set", () => {
		const { map } = installMemoryStorage();
		const store = createModelStore();
		store.getState().toggleModelEnabled(SONNET.id);

		const persisted = JSON.parse(map.get("model-store") as string);
		expect(Array.isArray(persisted.state.enabledModels)).toBe(true);
		expect(persisted.state.enabledModels).not.toContain(SONNET.id);

		const rehydrated = createModelStore();
		expect(rehydrated.getState().enabledModels).toBeInstanceOf(Set);
	});

	it("merge enables newly added models that were not in the persisted set", () => {
		const { map } = installMemoryStorage();
		map.set(
			"model-store",
			JSON.stringify({
				state: {
					selectedModel: HAIKU,
					enabledModels: [HAIKU.id],
					selectedFeatures: []
				},
				version: 0
			})
		);
		const store = createModelStore();
		expect(store.getState().enabledModels.size).toBe(modelCards.length);
	});
});
