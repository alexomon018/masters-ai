import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadGoldenDataset<T>(filename: string): T[] {
	const path = join("evals", "datasets", "golden", filename);
	return JSON.parse(readFileSync(path, "utf-8")) as T[];
}
