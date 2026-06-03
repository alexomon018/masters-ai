import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { getQueryClient } from "@/providers/getQueryClient";
import { routeTree } from "./routeTree.gen";
import "./index.css";

// The same singleton queryClientProvider hands to React, so route loaders and
// component useQuery hooks share one cache.
const queryClient = getQueryClient();

// `defaultPreload: "intent"` prefetches a route (loader included) on link
// hover/focus. `context` exposes the query client to loaders, which run
// outside React and can't reach it through a provider.
const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
	context: { queryClient }
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error('Root element "#root" not found');
}

createRoot(rootElement).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>
);
