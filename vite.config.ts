import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Vite SPA replacing the old Next.js front end. The chat engine, API routes
// and auth all live in the Cloudflare Worker now — this build only emits
// static assets. Security headers (CSP etc.) are served by the host via
// `public/_headers` (Cloudflare Pages), not from here.
export default defineConfig({
	plugins: [
		// Must run before the React plugin so generated route files are picked
		// up by Fast Refresh. Mirrors the old Next file-based routing.
		tanstackRouter({
			target: "react",
			routesDirectory: "src/routes",
			generatedRouteTree: "src/routeTree.gen.ts",
			autoCodeSplitting: true
		}),
		react(),
		// `@svgr/webpack` in the old next.config turned bare `import X from "./x.svg"`
		// into a React component. `include: "**/*.svg"` makes the default export a
		// component (no `?react` suffix needed), matching global.d.ts and every
		// existing call site (e.g. assets/icons/index.ts, CustomIcon).
		svgr({
			include: "**/*.svg",
			svgrOptions: {
				icon: true,
				replaceAttrValues: { "#333": "{props.fill}" },
				svgoConfig: {
					plugins: [
						{
							name: "preset-default",
							params: { overrides: { removeViewBox: false } }
						}
					]
				}
			}
		})
	],
	// Resolves @atoms / @organisms / @utils / @/* etc. from tsconfig.json
	// (Vite 8 native — replaces the vite-tsconfig-paths plugin).
	resolve: { tsconfigPaths: true },
	server: { port: 3000 }
});
