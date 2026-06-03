import { createFileRoute, redirect } from "@tanstack/react-router";

// `/settings` → redirect to the default tab. Was a Next server `redirect()`
// in app/settings/page.tsx; here it's a route `beforeLoad` redirect.
export const Route = createFileRoute("/settings/")({
	beforeLoad: () => {
		throw redirect({
			to: "/settings/$tab",
			params: { tab: "account" }
		});
	}
});
