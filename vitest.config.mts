import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// In the app, @svgr/webpack turns `import Logo from "./x.svg"` into a React
// component. Under Vite/Vitest we don't need the real artwork — this inline
// plugin returns a stub component (plain JS, React.createElement) so SVG
// imports render as a harmless <svg> and forward props. Avoids depending on
// vite-plugin-svgr's JSX-transform behaviour under Vite 8 / rolldown.
const svgStubPlugin = (): Plugin => ({
	name: "svg-stub",
	enforce: "pre",
	load(id) {
		if (!id.endsWith(".svg")) return null;
		return [
			'import { createElement } from "react";',
			"const SvgStub = (props) => createElement('svg', props);",
			"export default SvgStub;",
			"export const ReactComponent = SvgStub;"
		].join("\n");
	}
});

// One Vitest runner, two projects:
//  - `unit`   : jsdom — front-end components, hooks, helpers, Next.js API
//               routes, pure utils. MSW intercepts `fetch`.
//  - `worker` : @cloudflare/vitest-pool-workers — worker modules run inside
//               workerd with real D1/DO bindings. Config lives in
//               `worker/vitest.config.mts` (it needs the cloudflareTest plugin).
//
// Path aliases (@atoms, @organisms, …) resolve via Vite's native
// resolve.tsconfigPaths, reading tsconfig.json.
export default defineConfig({
	plugins: [svgStubPlugin(), react()],
	resolve: { tsconfigPaths: true },
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					environment: "jsdom",
					globals: true,
					// Worker base URL the client helpers read via
					// import.meta.env.VITE_WORKER_URL. Vitest injects test.env into
					// both process.env and import.meta.env.
					env: { VITE_WORKER_URL: "http://localhost:8787" },
					setupFiles: ["./test/setup.unit.ts"],
					include: [
						"{components,src,utils,store,constants,providers,ai,evals}/**/*.test.{ts,tsx}"
					],
					exclude: ["worker/**", "node_modules/**", "dist/**"],
					coverage: {
						provider: "v8",
						reporter: ["text", "html"],
						// Coverage is measured for the unit (jsdom) project only. The
						// worker project runs inside workerd, where the V8 coverage
						// provider can't load `node:inspector/promises`.
						include: [
							"components/organisms/Chat/**/*.{ts,tsx}",
							"components/molecules/ChatModelSelector/**/*.{ts,tsx}",
							"components/organisms/ChatForm/**/*.{ts,tsx}",
							"store/modelStore.ts",
							"utils/anonId.ts",
							"utils/tryCatch.ts",
							"constants/llmValidationSchema.ts",
							"ai/llm.ts"
						],
						exclude: [
							"**/index.ts",
							"**/*.stories.tsx",
							"**/*.test.{ts,tsx}",
							"**/*.d.ts",
							// Presentational scroll/layout glue — no logic worth line-counting.
							"components/organisms/Chat/Chat.tsx"
						],
						thresholds: {
							lines: 80,
							functions: 80,
							statements: 80,
							branches: 75
						}
					}
				}
			},
			"./worker/vitest.config.mts"
		]
	}
});
