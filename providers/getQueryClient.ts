import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

// Single QueryClient for the SPA. There's no SSR/dehydration to juggle (the
// front end is a static Vite build; all server work lives in the Worker), so a
// lazily-created module-level client is all we need.
let queryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
	if (!queryClient) {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					staleTime: 60 * 1000
				}
			}
		});
	}
	return queryClient;
}

const QUERY_CACHE_STORAGE_KEY = "masters-chat-query-cache";

// localStorage persister so the cache survives a hard refresh. Without this the
// threads list starts empty on every cold load and the sidebar flickers
// empty→populated while it refetches. With it, the last-known cache hydrates
// synchronously and a background refetch updates it. SSR-safe (window guard).
export const queryPersister =
	typeof window === "undefined"
		? undefined
		: createSyncStoragePersister({
				storage: window.localStorage,
				key: QUERY_CACHE_STORAGE_KEY
			});

// Bump to invalidate persisted caches whose shape changed (becomes the
// PersistQueryClientProvider `buster`).
export const QUERY_CACHE_VERSION = "v1";

// Wipe the persisted cache. Call on sign-out so the next session doesn't
// hydrate the previous identity's threads from localStorage before the
// background refetch corrects them.
export function clearPersistedQueryCache() {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
}
