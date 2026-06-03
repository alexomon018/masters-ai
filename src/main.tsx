import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./index.css";

// Single TanStack Router instance for the SPA. `defaultPreload: "intent"`
// prefetches a route on link hover/focus — the closest analogue to Next's
// automatic <Link> prefetching.
const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true
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
