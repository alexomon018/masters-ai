import "dotenv/config";
import { Index as UpstashIndex } from "@upstash/vector";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";
import ora from "ora";
import pLimit from "p-limit";

interface CSVRecord {
	FILE_NAME: string;
	COURSE_NAME: string;
	TIMESTAMP: string;
	CONTENT: string;
	TEACHER_NAME: string;
}

// Initialize Upstash Vector client
const index = new UpstashIndex({
	url: process.env.UPSTASH_VECTOR_REST_URL as string,
	token: process.env.UPSTASH_VECTOR_REST_TOKEN as string
});

// Function to index Masters data
export async function indexMastersData() {
	const spinner = ora("Reading CSV files...").start();

	// Read all CSV files from the directory
	const csvFolderPath = path.join(process.cwd(), "ai/csv");
	const files = fs
		.readdirSync(csvFolderPath)
		.filter((file) => file.endsWith(".csv"));

	spinner.text = "Starting content indexing...";

	const limit = pLimit(10);

	await Promise.all(
		files.map(async (file) => {
			const csvPath = path.join(csvFolderPath, file);
			const csvData = fs.readFileSync(csvPath, "utf-8");
			const records = parse(csvData, {
				columns: true,
				skip_empty_lines: true
			});

			// Process records in parallel batches
			const promises = records.map((record: CSVRecord) =>
				limit(async () => {
					spinner.text = `Indexing: ${record.FILE_NAME}`;
					const text = record.CONTENT;

					try {
						await index.upsert({
							id: `${record.COURSE_NAME}_${record.FILE_NAME}_${record.TIMESTAMP}`,
							data: text,
							metadata: {
								courseName: record.COURSE_NAME,
								fileName: record.FILE_NAME,
								timestamp: record.TIMESTAMP,
								teacherName: record.TEACHER_NAME
							}
						});
					} catch (error) {
						spinner.fail(`Error indexing ${record.FILE_NAME}`);
						console.error(error);
					}
				})
			);

			return Promise.all(promises);
		})
	);

	spinner.succeed("Finished indexing all CSV files");
}
indexMastersData();
