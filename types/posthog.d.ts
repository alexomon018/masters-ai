// Temporary ambient declarations for posthog-js and @posthog/react.
// These are used only until `yarn install` pulls in the real packages.
// TypeScript prefers installed node_modules types over these stubs.

declare module "posthog-js" {
	interface PostHogInstance {
		identify(
			distinctId: string,
			properties?: Record<string, unknown>
		): void;
		capture(event: string, properties?: Record<string, unknown>): void;
		captureException(error: unknown, properties?: Record<string, unknown>): void;
		reset(): void;
	}
	const posthog: PostHogInstance;
	export default posthog;
}

declare module "@posthog/react" {
	import type { ReactNode } from "react";

	interface PostHogConfig {
		api_host?: string;
		ui_host?: string;
		defaults?: string;
		capture_exceptions?: boolean;
		debug?: boolean;
		[key: string]: unknown;
	}

	interface PostHogProviderProps {
		apiKey: string;
		options?: PostHogConfig;
		children?: ReactNode;
	}

	interface PostHogInstance {
		identify(
			distinctId: string,
			properties?: Record<string, unknown>
		): void;
		capture(event: string, properties?: Record<string, unknown>): void;
		captureException(error: unknown, properties?: Record<string, unknown>): void;
		reset(): void;
	}

	export function PostHogProvider(props: PostHogProviderProps): JSX.Element;
	export function usePostHog(): PostHogInstance;
}
