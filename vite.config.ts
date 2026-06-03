import { promises as fs } from "node:fs";
import { defineConfig, transformWithEsbuild, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { transform as svgrTransform } from "@svgr/core";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// SVG-as-React-component plugin. The old next.config used @svgr/webpack to
// turn bare `import X from "./x.svg"` into a component. vite-plugin-svgr can't
// do this under Vite 8 / rolldown — it hands raw JSX to the bundler, which
// can't parse it (the same reason the Vitest config stubs SVGs). So we run
// SVGR ourselves and compile the JSX down to plain JS with esbuild before
// rolldown ever sees it.
const svgrComponentPlugin = (): Plugin => ({
	name: "svgr-component",
	enforce: "pre",
	async load(id) {
		const [filePath] = id.split("?");
		if (!filePath.endsWith(".svg")) return null;

		const svg = await fs.readFile(filePath, "utf8");
		const componentJsx = await svgrTransform(
			svg,
			{
				icon: true,
				exportType: "default",
				jsxRuntime: "automatic",
				// `#333` -> `props.fill` so CustomIcon can theme the icon (matches
				// the old @svgr/webpack replaceAttrValues). viewBox is preserved
				// because we don't run SVGO.
				replaceAttrValues: { "#333": "{props.fill}" },
				plugins: ["@svgr/plugin-jsx"]
			},
			{ componentName: "SvgComponent" }
		);

		const { code, map } = await transformWithEsbuild(componentJsx, filePath, {
			loader: "jsx",
			jsx: "automatic"
		});
		return { code, map };
	}
});

// Vite SPA replacing the old Next.js front end. The chat engine, API routes
// and auth all live in the Cloudflare Worker now — this build only emits
// static assets. Security headers (CSP etc.) are served by the host
// (vercel.json), not from here.
export default defineConfig({
	plugins: [
		svgrComponentPlugin(),
		// Must run before the React plugin so generated route files are picked
		// up by Fast Refresh. Mirrors the old Next file-based routing.
		tanstackRouter({
			target: "react",
			routesDirectory: "src/routes",
			generatedRouteTree: "src/routeTree.gen.ts",
			autoCodeSplitting: true
		}),
		react()
	],
	// Resolves @atoms / @organisms / @utils / @/* etc. from tsconfig.json
	// (Vite 8 native — replaces the vite-tsconfig-paths plugin).
	resolve: { tsconfigPaths: true },
	server: { port: 3000 }
});
