import { createRequire } from "module";
import initSqlJs, { type Database, type SqlValue } from "sql.js";

// sql.js resolves sql-wasm.wasm relative to the running script by default, which
// breaks when braintrust bundles the eval files. Resolve it from node_modules.
const requireFromRoot = createRequire(`${process.cwd()}/package.json`);
const sqlWasmPath = requireFromRoot.resolve("sql.js/dist/sql-wasm.wasm");

export interface CatalogSeedRow {
	instructor: string;
	courseName: string;
	courseTitle: string;
	releasedAt: string;
}

export const EVAL_CATALOG_SEED: CatalogSeedRow[] = [
	{
		instructor: "Brian Holt",
		courseName: "complete-intro-containers-v2",
		courseTitle: "Complete Intro Containers v2",
		releasedAt: "2024-08-06",
	},
	{
		instructor: "Brian Holt",
		courseName: "complete-intro-react",
		courseTitle: "Complete Intro to React",
		releasedAt: "2023-06-01",
	},
	{
		instructor: "Brian Holt",
		courseName: "intermediate-react",
		courseTitle: "Intermediate React",
		releasedAt: "2023-09-01",
	},
	{
		instructor: "Scott Moss",
		courseName: "next-js",
		courseTitle: "Next.js",
		releasedAt: "2024-01-15",
	},
	{
		instructor: "Scott Moss",
		courseName: "react-performance",
		courseTitle: "React Performance",
		releasedAt: "2025-02-10",
	},
	{
		instructor: "Mike North",
		courseName: "typescript",
		courseTitle: "TypeScript",
		releasedAt: "2022-01-01",
	},
	{
		instructor: "Jen Kramer",
		courseName: "css-grid",
		courseTitle: "CSS Grid",
		releasedAt: "2021-05-01",
	},
	{
		instructor: "Will Sentance",
		courseName: "node-js",
		courseTitle: "Node.js",
		releasedAt: "2020-03-01",
	},
	{
		instructor: "Will Sentance",
		courseName: "hard-parts-async",
		courseTitle: "JavaScript Hard Parts: Async",
		releasedAt: "2019-11-01",
	},
	{
		instructor: "Kevin Powell",
		courseName: "pro-css",
		courseTitle: "Pro CSS",
		releasedAt: "2025-01-20",
	},
];

type D1Meta = {
	duration: number;
	last_row_id: number;
	changes: number;
	served_by: string;
};

type D1Result<T = Record<string, SqlValue>> = {
	success: boolean;
	meta: D1Meta;
	results?: T[];
};

class SqlJsPreparedStatement {
	private readonly db: Database;

	private readonly sql: string;

	private bindings: SqlValue[] = [];

	constructor(db: Database, sql: string) {
		this.db = db;
		this.sql = sql;
	}

	bind(...values: SqlValue[]): D1PreparedStatement {
		this.bindings = values;
		return this;
	}

	async first<T = Record<string, SqlValue>>(): Promise<T | null> {
		const result = await this.all<T>();
		return result.results?.[0] ?? null;
	}

	async all<T = Record<string, SqlValue>>(): Promise<D1Result<T>> {
		const stmt = this.db.prepare(this.sql);
		try {
			if (this.bindings.length > 0) stmt.bind(this.bindings);
			const rows: T[] = [];
			while (stmt.step()) {
				rows.push(stmt.getAsObject() as T);
			}
			return {
				success: true,
				meta: emptyMeta(),
				results: rows,
			};
		} finally {
			stmt.free();
		}
	}

	async run(): Promise<D1Result> {
		this.db.run(this.sql, this.bindings);
		return {
			success: true,
			meta: {
				...emptyMeta(),
				changes: this.db.getRowsModified(),
				last_row_id: Number(this.db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] ?? 0),
			},
		};
	}

	async raw<T = SqlValue[]>(): Promise<T[]> {
		const stmt = this.db.prepare(this.sql);
		try {
			if (this.bindings.length > 0) stmt.bind(this.bindings);
			const rows: T[] = [];
			while (stmt.step()) {
				rows.push(stmt.get() as T);
			}
			return rows;
		} finally {
			stmt.free();
		}
	}
}

class SqlJsD1Database {
	constructor(private readonly db: Database) {}

	prepare(query: string): D1PreparedStatement {
		return new SqlJsPreparedStatement(this.db, query);
	}

	async batch<T = Record<string, SqlValue>>(
		statements: D1PreparedStatement[]
	): Promise<D1Result<T>[]> {
		return Promise.all(
			statements.map((statement) => statement.run() as Promise<D1Result<T>>)
		);
	}

	async exec(query: string): Promise<D1ExecResult> {
		this.db.exec(query);
		return {
			count: this.db.getRowsModified(),
			duration: 0,
		};
	}
}

function emptyMeta(): D1Meta {
	return {
		duration: 0,
		last_row_id: 0,
		changes: 0,
		served_by: "eval-catalog",
	};
}

function seedCatalog(db: Database, rows: CatalogSeedRow[]): void {
	db.run(`
		CREATE TABLE courses (
			instructor text NOT NULL,
			course_name text NOT NULL,
			course_title text NOT NULL DEFAULT '',
			released_at text NOT NULL DEFAULT '',
			PRIMARY KEY (instructor, course_name)
		)
	`);
	db.run(`CREATE INDEX courses_instructor ON courses (instructor)`);

	const insert = db.prepare(
		`INSERT INTO courses (instructor, course_name, course_title, released_at)
		 VALUES (?, ?, ?, ?)`
	);
	for (const row of rows) {
		insert.run([row.instructor, row.courseName, row.courseTitle, row.releasedAt]);
	}
	insert.free();
}

let catalogDbPromise: Promise<D1Database> | null = null;

export async function getEvalCatalogDb(): Promise<D1Database> {
	if (!catalogDbPromise) {
		catalogDbPromise = createEvalCatalogDb().catch((err) => {
			catalogDbPromise = null;
			throw err;
		});
	}
	return catalogDbPromise;
}

export async function createEvalCatalogDb(
	rows: CatalogSeedRow[] = EVAL_CATALOG_SEED
): Promise<D1Database> {
	const sql = await initSqlJs({ locateFile: () => sqlWasmPath });
	const db = new sql.Database();
	seedCatalog(db, rows);
	return new SqlJsD1Database(db);
}
