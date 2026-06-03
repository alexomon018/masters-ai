import { createFileRoute, redirect } from "@tanstack/react-router";

// `/settings` → redirect to the default tab.
export const Route = createFileRoute("/settings/")({
	beforeLoad: () => {
		throw redirect({
			to: "/settings/$tab",
			params: { tab: "account" }
		});
	}
});
