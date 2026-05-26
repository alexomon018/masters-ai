import type { D1Migration } from "cloudflare:test";
import type { Env } from "../src/env";

// Augment the `cloudflare:test` module's `ProvidedEnv` so `import { env }`
// is typed with our worker bindings plus the migrations array injected by
// worker/vitest.config.ts.
declare module "cloudflare:test" {
	interface ProvidedEnv extends Env {
		TEST_MIGRATIONS: D1Migration[];
	}
}
