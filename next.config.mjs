/** @type {import('next').NextConfig} */

// Worker URL (Cloudflare DO) used by the chat WebSocket. Read at build
// time so the CSP `connect-src` directive can be exact rather than `*`.
const workerHttpUrl = process.env.NEXT_PUBLIC_WORKER_URL ?? "";
const workerWsUrl = workerHttpUrl
	.replace(/^https:/, "wss:")
	.replace(/^http:/, "ws:");
const workerSources = [workerHttpUrl, workerWsUrl].filter(Boolean).join(" ");

// Tightened CSP. `unsafe-inline` for styles is unavoidable without per-
// request nonces (Next inlines critical CSS as <style> blocks); script
// uses `unsafe-eval`/`unsafe-inline` because Clerk's JS runtime needs
// them. If you ever switch to Clerk via server-side rendering only, those
// two can be dropped. `frame-src` includes Clerk's hosted accounts UI.
const CSP_DIRECTIVES = [
	"default-src 'self'",
	"img-src 'self' data: blob: https://static.frontendmasters.com https://frontendmasters.com https://img.clerk.com",
	"font-src 'self' data:",
	`script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com`,
	"style-src 'self' 'unsafe-inline'",
	`connect-src 'self' ${workerSources} https://*.clerk.accounts.dev https://*.clerk.com wss://*.clerk.accounts.dev`,
	"frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
	"worker-src 'self' blob:",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'"
];

// Headers applied to every response. Locks down framing, content sniffing,
// referer leakage, and forces HTTPS via HSTS in production.
const SECURITY_HEADERS = [
	{ key: "Content-Security-Policy", value: CSP_DIRECTIVES.join("; ") },
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains; preload"
	},
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
	}
];

const nextConfig = {
	images: {
		remotePatterns: [
			{ hostname: "static.frontendmasters.com" },
			{ hostname: "img.clerk.com" }
		]
	},
	async headers() {
		return [
			{
				source: "/:path*",
				headers: SECURITY_HEADERS
			}
		];
	},
	webpack: (config, { webpack, isServer, nextRuntime }) => {
		// Grab the existing rule that handles SVG imports
		const fileLoaderRule = config.module.rules
			.find((rule) => rule.oneOf)
			.oneOf.find((rule) => rule.test?.test?.(".svg"));

		config.module.rules.push({
			test: /\.svg$/,
			use: [
				{
					loader: "@svgr/webpack",
					options: {
						icon: true,
						replaceAttrValues: { "#333": "{props.fill}" },
						svgoConfig: {
							plugins: [
								{
									name: "preset-default",
									params: {
										overrides: {
											removeViewBox: false
										}
									}
								}
							]
						}
					}
				}
			]
		});

		// Modify the file loader to ignore svg files
		if (fileLoaderRule) {
			fileLoaderRule.exclude = /\.svg$/i;
		}

		return config;
	},
	// Increase the default timeout for API routes
	serverRuntimeConfig: {
		apiTimeout: 60000 // 60 seconds
	},
	experimental: {
		proxyTimeout: 150000
	}
};

export default nextConfig;
