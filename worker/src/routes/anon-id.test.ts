import { describe, expect, it } from "vitest";
import { issueAnonId } from "./anon-id";
import { verifyAnonId } from "../anonId";
import type { Env } from "../env";

const SECRET = "shared-hmac-secret";
const env = { ANON_ID_SECRET: SECRET } as unknown as Env;

describe("issueAnonId", () => {
	it("mints a signed anon id that the worker can verify", async () => {
		const res = await issueAnonId(env);
		expect(res.status).toBe(200);
		const { anonId } = (await res.json()) as { anonId: string };
		expect(anonId).toContain(".");
		await expect(verifyAnonId(anonId, SECRET)).resolves.toMatch(
			/^[A-Za-z0-9_-]{8,64}$/
		);
	});

	it("returns 503 when ANON_ID_SECRET is not configured", async () => {
		const res = await issueAnonId({} as Env);
		expect(res.status).toBe(503);
	});
});
