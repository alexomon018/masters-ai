import { createFileRoute } from "@tanstack/react-router";

// `/auth` — sign-in. Scaffold placeholder; the component port renders the
// Clerk <SignInButton> ("Continue with Google") from @clerk/clerk-react.
const AuthPage = () => (
	<div className="flex h-full items-center justify-center text-muted-foreground">
		Auth route (scaffold)
	</div>
);

export const Route = createFileRoute("/auth")({
	component: AuthPage
});
