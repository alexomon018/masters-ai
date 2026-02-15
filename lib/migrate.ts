import dotenv from "dotenv";
import path from "path";
import { migrate } from "drizzle-orm/neon-http/migrator";
import db from "./db";

dotenv.config();

async function main() {
	await migrate(db, {
		migrationsFolder: path.join(__dirname, "./migrations")
	});
	// eslint-disable-next-line no-console
	console.log(`Migrations complete`);
}

main();
