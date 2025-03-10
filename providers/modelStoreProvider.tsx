"use client";

import { type ReactNode, createContext, useRef, useContext } from "react";
import { useStore } from "zustand";

import { type ModelStore, createModelStore } from "@/store";

export type ModelStoreApi = ReturnType<typeof createModelStore>;

export const ModelStoreContext = createContext<ModelStoreApi | undefined>(
	undefined
);

export interface ModelStoreProviderProps {
	children: ReactNode;
}

export const ModelStoreProvider = ({ children }: ModelStoreProviderProps) => {
	const storeRef = useRef<ModelStoreApi>(null);
	if (!storeRef.current) {
		storeRef.current = createModelStore();
	}

	return (
		<ModelStoreContext.Provider value={storeRef.current}>
			{children}
		</ModelStoreContext.Provider>
	);
};

export const useModelStore = <T,>(selector: (store: ModelStore) => T): T => {
	const modelStoreContext = useContext(ModelStoreContext);

	if (!modelStoreContext) {
		throw new Error(`useModelStore must be used within ModelStoreProvider`);
	}

	return useStore(modelStoreContext, selector);
};
