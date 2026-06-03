import { createFileRoute, Outlet } from "@tanstack/react-router";

// `/settings` layout route (was app/settings/layout.tsx). Scaffold
// placeholder renders just the nested <Outlet>. The component port adds the
// signed-in guard, the sidebar (UserProfile / MessageUsage / shortcuts), and
// fetches usage data from the worker instead of reading Redis server-side.
const SettingsLayout = () => (
	<div className="min-h-screen bg-background">
		<Outlet />
	</div>
);

export const Route = createFileRoute("/settings")({
	component: SettingsLayout
});
