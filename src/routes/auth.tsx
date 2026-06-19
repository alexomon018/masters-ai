import { createFileRoute } from "@tanstack/react-router";
import { SignInButton } from "@clerk/clerk-react";
import { Button, Card, CustomIcon } from "@atoms";

// `/auth` — sign-in. Both redirect props return to home after auth: a brand-new
// user goes through Clerk's sign-up flow, which ignores forceRedirectUrl and
// would otherwise fall back to the Dashboard default (left them on /auth).
const AuthPage = () => (
	<div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-10">
		<div
			aria-hidden
			className="bg-primary/10 pointer-events-none absolute left-1/2 top-1/2 size-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
		/>

		<Card className="border-border/60 relative w-full max-w-sm p-8 shadow-lg sm:p-10">
			<div className="flex flex-col items-center gap-7 text-center">
				<div className="flex flex-col items-center gap-3">
					<span className="bg-primary/10 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
						FE Masters Chat
					</span>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						Welcome back
					</h1>
					<p className="max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
						{`Sign in to keep your chats in sync — and we'll bump up your daily message limit while you're at it. 😉`}
					</p>
				</div>

				<SignInButton forceRedirectUrl="/" signUpForceRedirectUrl="/">
					<Button
						variant="outline"
						className="flex h-12 w-full items-center justify-center gap-3 rounded-lg text-base font-medium shadow-sm"
					>
						<CustomIcon icon="google" className="size-5" />
						Continue with Google
					</Button>
				</SignInButton>

				<p className="text-xs text-muted-foreground">
					By continuing you agree to our Terms & Privacy Policy.
				</p>
			</div>
		</Card>
	</div>
);

export const Route = createFileRoute("/auth")({
	component: AuthPage
});
