import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.THREAD_INDEX, env.TEST_MIGRATIONS);
