import { applyD1Migrations, env } from "cloudflare:test";

// Apply Drizzle D1 migrations to the in-memory THREAD_INDEX before the worker
// test suite runs. The migrations array is injected as a binding by
// worker/vitest.config.ts (read on the Node side with readD1Migrations()).
await applyD1Migrations(env.THREAD_INDEX, env.TEST_MIGRATIONS);
