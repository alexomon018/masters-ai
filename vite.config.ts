import { promises as fs } from "node:fs";
import { defineConfig, transformWithOxc, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { transform as svgrTransform } from "@svgr/core";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Turns `import X from "./x.svg"` into a React component. vite-plugin-svgr
// can't do this under Vite 8 / rolldown (it emits raw JSX the bundler can't
// parse), so we run SVGR and compile the JSX to JS with Oxc ourselves.
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
				// `#333` -> `props.fill` so CustomIcon can theme the icon.
				replaceAttrValues: { "#333": "{props.fill}" },
				plugins: ["@svgr/plugin-jsx"]
			},
			{ componentName: "SvgComponent" }
		);

		const { code, map } = await transformWithOxc(componentJsx, filePath, {
			lang: "jsx",
			jsx: "automatic"
		});
		return { code, map };
	}
});

// Vite SPA — emits static assets only; the chat engine, API and auth live in
// the Cloudflare Worker. Security headers are served by the host (vercel.json).
export default defineConfig({
	plugins: [
		svgrComponentPlugin(),
		// Must run before the React plugin so generated route files get Fast Refresh.
		tanstackRouter({
			target: "react",
			routesDirectory: "src/routes",
			generatedRouteTree: "src/routeTree.gen.ts",
			autoCodeSplitting: true
		}),
		react()
	],
	// Resolves @atoms / @organisms / @hooks / @/* etc. from tsconfig.json.
	resolve: { tsconfigPaths: true },
	server: { host: true, port: 3000 }
});
