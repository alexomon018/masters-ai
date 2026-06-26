import "dotenv/config";
import fs from "fs";
import path from "path";
import { Index } from "@upstash/vector";
import pLimit from "p-limit";

/**
 * Ingest the chunked Frontend Masters transcripts (produced by
 * `scripts/processTranscripts.js` in the fm-transcripts repo) into the NEW v2
 * Upstash Vector index (`masters-improved`). The prod index is never touched —
 * this script reads `UPSTASH_VECTOR_REST_URL_V2` / `_TOKEN_V2` only.
 *
 * The v2 index has a hosted embedding model, so we upsert raw `data` text and
 * Upstash embeds it server-side. Upserts are batched and run with bounded
 * concurrency, and completed course files are checkpointed so a failed run
 * resumes instead of re-uploading everything.
 *
 * Usage:
 *   CSV_DIR=~/Documents/fm-transcripts-master/csv tsx ai/ingestTranscripts.ts
 *   (CSV_DIR defaults to ../fm-transcripts-master/csv relative to repo root)
 */

interface ChunkRow {
	COURSE_NAME: string;
	COURSE_DIR: string;
	VERSION: string;
	RELEASE_DATE: string;
	FILE_NAME: string;
	CHUNK_INDEX: string;
	TIMESTAMP: string;
	CONTENT: string;
	TEACHER_NAME: string;
}

const CSV_DIR =
	process.env.CSV_DIR ??
	path.resolve(process.cwd(), "..", "fm-transcripts-master", "csv");
const CHECKPOINT_PATH = path.resolve(
	process.cwd(),
	"ai",
	".ingest-checkpoint.json"
);
const BATCH_SIZE = 100;
const FILE_CONCURRENCY = 6;

function requireEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(
			`Missing ${name}. Set the v2 vector index credentials in .env before ingesting.`
		);
	}
	return value;
}

const index = new Index({
	url: requireEnv("UPSTASH_VECTOR_REST_URL_V2"),
	token: requireEnv("UPSTASH_VECTOR_REST_TOKEN_V2")
});

function loadCheckpoint(): Set<string> {
	if (!fs.existsSync(CHECKPOINT_PATH)) return new Set();
	try {
		const raw = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf-8"));
		return new Set<string>(Array.isArray(raw.completed) ? raw.completed : []);
	} catch {
		return new Set();
	}
}

function saveCheckpoint(completed: Set<string>): void {
	fs.writeFileSync(
		CHECKPOINT_PATH,
		JSON.stringify({ completed: [...completed] }, null, 2)
	);
}

// RFC-4180 CSV parse: handles quoted fields containing commas, quotes (""), and
// newlines. The transcript CSVs are produced by csv-writer so they are well
// formed; this keeps the ingest dependency-free.
function parseCsvRows(csv: string): string[][] {
	const rows: string[][] = [];
	let field = "";
	let row: string[] = [];
	let inQuotes = false;

	for (let i = 0; i < csv.length; i += 1) {
		const ch = csv[i];
		if (inQuotes) {
			if (ch === '"') {
				if (csv[i + 1] === '"') {
					field += '"';
					i += 1;
				} else {
					inQuotes = false;
				}
			} else {
				field += ch;
			}
		} else if (ch === '"') {
			inQuotes = true;
		} else if (ch === ",") {
			row.push(field);
			field = "";
		} else if (ch === "\n" || ch === "\r") {
			if (ch === "\r" && csv[i + 1] === "\n") i += 1;
			row.push(field);
			field = "";
			rows.push(row);
			row = [];
		} else {
			field += ch;
		}
	}
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

function readChunkRows(filePath: string): ChunkRow[] {
	const rows = parseCsvRows(fs.readFileSync(filePath, "utf-8"));
	if (rows.length < 2) return [];
	const header = rows[0];
	return rows
		.slice(1)
		.map((cells) => {
			const record = {} as Record<string, string>;
			header.forEach((key, idx) => {
				record[key] = cells[idx] ?? "";
			});
			return record as unknown as ChunkRow;
		})
		.filter((r) => r.CONTENT && r.CONTENT.trim().length > 0);
}

// Deterministic per-chunk id so re-runs overwrite the same vector (idempotent).
function chunkId(row: ChunkRow): string {
	return `${row.COURSE_DIR}__${row.FILE_NAME}__${row.CHUNK_INDEX}`;
}

function toVector(row: ChunkRow) {
	return {
		id: chunkId(row),
		data: row.CONTENT,
		metadata: {
			courseName: row.COURSE_NAME,
			courseDir: row.COURSE_DIR,
			version: row.VERSION,
			releaseDate: row.RELEASE_DATE,
			fileName: row.FILE_NAME,
			chunkIndex: Number(row.CHUNK_INDEX),
			timestamp: row.TIMESTAMP,
			teacherName: row.TEACHER_NAME
		}
	};
}

async function upsertInBatches(rows: ChunkRow[]): Promise<void> {
	// Batches are sent sequentially on purpose to stay within Upstash rate
	// limits; cross-file parallelism comes from the p-limit pool in ingest().
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batch = rows.slice(i, i + BATCH_SIZE).map(toVector);
		// eslint-disable-next-line no-await-in-loop
		await index.upsert(batch);
	}
}

async function ingest(): Promise<void> {
	if (!fs.existsSync(CSV_DIR)) {
		throw new Error(
			`CSV_DIR not found: ${CSV_DIR}. Run processTranscripts.js in the transcripts repo first, or set CSV_DIR.`
		);
	}

	const files = fs
		.readdirSync(CSV_DIR)
		.filter((f) => f.endsWith(".csv"))
		.sort();
	const completed = loadCheckpoint();
	const pending = files.filter((f) => !completed.has(f));

	// eslint-disable-next-line no-console
	console.log(
		`Ingesting ${pending.length} course CSVs (${completed.size} already done) from ${CSV_DIR} -> v2 index`
	);

	const limit = pLimit(FILE_CONCURRENCY);
	let totalChunks = 0;

	await Promise.all(
		pending.map((file) =>
			limit(async () => {
				const rows = readChunkRows(path.join(CSV_DIR, file));
				await upsertInBatches(rows);
				completed.add(file);
				saveCheckpoint(completed);
				totalChunks += rows.length;
				// eslint-disable-next-line no-console
				console.log(`  ✅ ${file}: ${rows.length} chunks`);
			})
		)
	);

	// eslint-disable-next-line no-console
	console.log(
		`Done. ${pending.length} courses, ${totalChunks} chunks upserted to v2.`
	);
}

ingest().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	// eslint-disable-next-line no-console
	console.error(`Ingest failed: ${message}`);
	process.exitCode = 1;
});
