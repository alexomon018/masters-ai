// Types for the Vite-injected `import.meta.env`. We intentionally do NOT
// `/// <reference types="vite/client" />` here: vite/client redeclares
// `*.svg` with a string default export, which conflicts with global.d.ts
// (where `*.svg` is a React component, matching vite-plugin-svgr). Declaring
// only what we use keeps global.d.ts authoritative for SVG imports.

interface ImportMetaEnv {
	// Vite built-ins (normally from vite/client, declared here to avoid its
	// conflicting `*.svg` module declaration — see note above).
	readonly MODE: string;
	readonly BASE_URL: string;
	readonly PROD: boolean;
	readonly DEV: boolean;
	readonly SSR: boolean;
	// Cloudflare Worker base URL (chat WS + API routes + anon-id). Was
	// NEXT_PUBLIC_WORKER_URL under Next.
	readonly VITE_WORKER_URL: string;
	// Clerk publishable key. Was NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
	readonly VITE_CLERK_PUBLISHABLE_KEY: string;
	// Optional Clerk Frontend API proxy (production DNS).
	readonly VITE_CLERK_PROXY_URL?: string;
	// PostHog analytics.
	readonly VITE_PUBLIC_POSTHOG_PROJECT_TOKEN: string;
	readonly VITE_PUBLIC_POSTHOG_HOST: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
