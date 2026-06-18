import { createFileRoute } from "@tanstack/react-router";
import { SignInButton } from "@clerk/clerk-react";
import { Button, CustomIcon } from "@atoms";

// `/auth` — sign-in. Both redirect props return to home after auth: a brand-new
// user goes through Clerk's sign-up flow, which ignores forceRedirectUrl and
// would otherwise fall back to the Dashboard default (left them on /auth).
const AuthPage = () => (
	<div className="flex min-h-screen items-center justify-center bg-background">
		<div className="flex flex-col items-center gap-4">
			<h1 className="text-4xl font-bold text-foreground">
				Welcome to FE Masters Chat
			</h1>
			<p className="text-muted-foreground">
				{`Sign in below (we'll increase your message limits if you do 😉)`}
			</p>
			<SignInButton forceRedirectUrl="/" signUpForceRedirectUrl="/">
				<Button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90">
					<CustomIcon icon="google" className="size-5" />
					Continue with Google
				</Button>
			</SignInButton>
		</div>
	</div>
);

export const Route = createFileRoute("/auth")({
	component: AuthPage
});
