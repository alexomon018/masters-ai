import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast";
import { lazy, ReactNode, Suspense } from "react";
// Import providers directly (not via the @providers barrel) so the app bundle
// never pulls in withThemeProvider → @storybook/addons.
import { ThemeProvider } from "@/providers/themeProvider";
import { ModelStoreProvider } from "@/providers/modelStoreProvider";
import QueryClientProvider from "@/providers/queryClientProvider";

// SPA shell: the provider stack wrapping the router <Outlet>.
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Lazy + DEV-gated so the import is dead code in production.
const RouterDevtools = import.meta.env.DEV
	? lazy(() =>
			import("@tanstack/react-router-devtools").then((m) => ({
				default: m.TanStackRouterDevtools
			}))
		)
	: () => null;

const ClerkWrapper = ({ children }: { children: ReactNode }) => {
	// Clerk is optional in local/dev when no key is configured.
	if (!clerkKey) return children;
	return <ClerkProvider publishableKey={clerkKey}>{children}</ClerkProvider>;
};

const RootComponent = () => (
	<ClerkWrapper>
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<ModelStoreProvider>
				<QueryClientProvider>
					<Toaster />
					<div className="flex h-full flex-col">
						<main className="flex-1 overflow-auto">
							<Outlet />
						</main>
					</div>
					<Suspense fallback={null}>
						<RouterDevtools />
					</Suspense>
				</QueryClientProvider>
			</ModelStoreProvider>
		</ThemeProvider>
	</ClerkWrapper>
);

const NotFound = () => (
	<div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
		<p className="text-lg">Page not found</p>
	</div>
);

// The shape of the context passed in main.tsx — available in every loader.
interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
	notFoundComponent: NotFound
});
