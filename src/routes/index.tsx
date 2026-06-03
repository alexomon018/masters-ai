import { createFileRoute } from "@tanstack/react-router";

// Home (`/`). Scaffold placeholder — wired to <Chat isNewThread> in the
// component-port phase, once its `next/*` and `@clerk/nextjs` imports are
// swapped for TanStack Router + @clerk/clerk-react.
const HomePage = () => (
	<div className="flex h-full items-center justify-center text-muted-foreground">
		Home route (scaffold)
	</div>
);

export const Route = createFileRoute("/")({
	component: HomePage
});
