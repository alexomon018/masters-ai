import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ClerkProvider } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast";
import { ReactNode } from "react";
// Import providers directly (not via the @providers barrel) so the app
// bundle never pulls in withThemeProvider → @storybook/addons.
import { ThemeProvider } from "@/providers/themeProvider";
import { ModelStoreProvider } from "@/providers/modelStoreProvider";
import QueryClientProvider from "@/providers/queryClientProvider";

// Root route — the SPA shell. Replaces the old Next `app/layout.tsx`:
// the same provider stack (Clerk → theme → model store → query) now wraps
// the router <Outlet> instead of `{children}`. The <html>/<body> tags and
// the theme-color script live in index.html (static, runs before paint).
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const ClerkWrapper = ({ children }: { children: ReactNode }) => {
	// Clerk is optional in local/dev when no key is configured — mirrors the
	// old layout, which rendered the tree unwrapped so the app still boots.
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
					{import.meta.env.DEV ? (
						<TanStackRouterDevtools position="bottom-right" />
					) : null}
				</QueryClientProvider>
			</ModelStoreProvider>
		</ThemeProvider>
	</ClerkWrapper>
);

export const Route = createRootRoute({
	component: RootComponent
});
