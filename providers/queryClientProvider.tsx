import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode } from "react";
import { queryKeys } from "@constants";
import {
	getQueryClient,
	queryPersister,
	QUERY_CACHE_VERSION
} from "./getQueryClient";

const THREADS_KEY = queryKeys.threads();

const QueryClientProvider = ({
	children
}: {
	children: ReactNode | ReactNode[];
}) => {
	const queryClient = getQueryClient();

	// No persister (SSR/edge) — fall back to the plain in-memory client.
	if (!queryPersister) {
		return (
			<>
				{children}
				<ReactQueryDevtools initialIsOpen={false} />
			</>
		);
	}

	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{
				persister: queryPersister,
				maxAge: 24 * 60 * 60 * 1000, // 24h — drop stale caches
				buster: QUERY_CACHE_VERSION,
				dehydrateOptions: {
					// Persist only the threads list (drives the sidebar, the source of
					// the cold-load flicker). The message quota is short-lived and
					// per-session, so it's left in memory only.
					shouldDehydrateQuery: (query) =>
						query.queryKey[0] === THREADS_KEY[0]
				}
			}}
		>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</PersistQueryClientProvider>
	);
};

export default QueryClientProvider;
