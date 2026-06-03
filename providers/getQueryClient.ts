import { QueryClient } from "@tanstack/react-query";

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
