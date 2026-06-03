import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Stubs SVG imports as a harmless prop-forwarding <svg> so tests don't depend
// on the real SVGR transform.
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

// Two projects: `unit` (jsdom, MSW-intercepted fetch) and `worker`
// (@cloudflare/vitest-pool-workers, configured in worker/vitest.config.mts).
// Path aliases resolve via Vite's native resolve.tsconfigPaths.
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
					// Read by client helpers via import.meta.env.VITE_WORKER_URL.
					env: { VITE_WORKER_URL: "http://localhost:8787" },
					setupFiles: ["./test/setup.unit.ts"],
					include: [
						"{components,src,hooks,utils,store,constants,providers,ai,evals}/**/*.test.{ts,tsx}"
					],
					exclude: ["worker/**", "node_modules/**", "dist/**"],
					coverage: {
						provider: "v8",
						reporter: ["text", "html"],
						// Unit (jsdom) project only — workerd can't load the V8 provider.
						include: [
							"components/organisms/Chat/**/*.{ts,tsx}",
							"components/molecules/ChatModelSelector/**/*.{ts,tsx}",
							"components/organisms/ChatForm/**/*.{ts,tsx}",
							"hooks/**/*.{ts,tsx}",
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
