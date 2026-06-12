import path from "node:path";
import { defineConfig } from "vitest/config";
import {
	cloudflareTest,
	readD1Migrations
} from "@cloudflare/vitest-pool-workers";

// Worker test project. Runs inside workerd via @cloudflare/vitest-pool-workers
// so `import { env } from "cloudflare:test"` exposes the real D1 binding
// (THREAD_INDEX) and miniflare-provided secrets. Outbound `fetch` (Upstash
// REST) is stubbed per-test with `fetchMock` from "cloudflare:test".
//
// Referenced from the root vitest.config.ts `projects` array. The config is an
// async factory so we can read the D1 migrations on the Node side (top-level
// await isn't supported when Vite bundles the config as CJS).
export default defineConfig(async () => {
	const migrations = await readD1Migrations(
		path.join(__dirname, "db", "migrations")
	);

	return {
		plugins: [
			cloudflareTest({
				wrangler: { configPath: "./wrangler.jsonc" },
				miniflare: {
					// Secrets the tested modules read off `env`. Test stubs only —
					// never real credentials. Upstash REST calls are intercepted.
					bindings: {
						TEST_MIGRATIONS: migrations,
						ANON_ID_SECRET: "test-anon-secret",
						CLERK_SECRET_KEY: "test-clerk-secret",
						UPSTASH_REDIS_REST_URL: "https://redis.test",
						UPSTASH_REDIS_REST_TOKEN: "test-redis-token",
						UPSTASH_VECTOR_REST_URL: "https://vector.test",
						UPSTASH_VECTOR_REST_TOKEN: "test-vector-token",
						OPENAI_API_KEY: "test-openai-key",
						ANTHROPIC_API_KEY: "test-anthropic-key",
						ALLOWED_ORIGINS: "http://localhost:3000"
					}
				}
			})
		],
		test: {
			name: "worker",
			include: ["src/**/*.test.ts"],
			setupFiles: ["./test/apply-migrations.ts"],
			// V8 coverage can't run inside workerd (`node:inspector/promises`).
			coverage: { enabled: false }
		}
	};
});
