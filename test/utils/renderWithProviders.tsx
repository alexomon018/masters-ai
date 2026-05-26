import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModelStoreProvider } from "@/providers";

// Builds a QueryClient with retries off so failing queries reject immediately
// instead of stalling the test for the default retry/backoff window.
export function makeTestQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	});
}

interface ProvidersProps {
	children: ReactNode;
	queryClient?: QueryClient;
}

export const TestProviders = ({ children, queryClient }: ProvidersProps) => {
	const client = queryClient ?? makeTestQueryClient();
	return (
		<QueryClientProvider client={client}>
			<ModelStoreProvider>{children}</ModelStoreProvider>
		</QueryClientProvider>
	);
};

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
	queryClient?: QueryClient;
}

// Drop-in for RTL `render` that wires the providers the chat tree needs.
// Clerk is mocked at the module level per-test, so no ClerkProvider here.
export function renderWithProviders(
	ui: ReactElement,
	{ queryClient, ...options }: CustomRenderOptions = {}
) {
	const client = queryClient ?? makeTestQueryClient();
	return {
		queryClient: client,
		...render(ui, {
			wrapper: ({ children }) => (
				<TestProviders queryClient={client}>{children}</TestProviders>
			),
			...options
		})
	};
}

export * from "@testing-library/react";
