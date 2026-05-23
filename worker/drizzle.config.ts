// Drizzle Kit config for the Worker's D1 database. Paths are anchored to
// this file so `yarn db:d1:generate` works from the repo root; relative
// paths alone would resolve against cwd and miss `worker/db/schema.ts`.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const workerDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	schema: path.join(workerDir, "db/schema.ts"),
	out: path.join(workerDir, "db/migrations"),
	dialect: "sqlite",
	driver: "d1-http",
});
