import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

if (!process.env.POSTGRES_URL) {
	throw new Error("POSTGRES_URL environment variable is not set");
}

const postgres = neon(process.env.POSTGRES_URL);
const db = drizzle(postgres);

export default db;
