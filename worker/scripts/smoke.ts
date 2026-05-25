// End-to-end smoke test for the Worker REST surface. Walks thread CRUD with
// HMAC-signed anon auth (always) and optional claim-anon when SMOKE_CLERK_JWT
// is set.
//
// Usage:
//   1. yarn worker:dev          (another shell)
//   2. yarn db:d1:migrate:local
//   3. ANON_ID_SECRET=<same as worker .dev.vars> \
//      WORKER_URL=http://localhost:8787 \
//      yarn worker:smoke
//
// Optional authenticated claim-anon check:
//   SMOKE_CLERK_JWT=<valid Clerk session JWT> yarn worker:smoke

import { generateRawAnonId, signAnonId } from "../../utils/anonId";

const WORKER_URL = process.env.WORKER_URL ?? "http://localhost:8787";
const ANON_SECRET = process.env.ANON_ID_SECRET ?? "";
const SMOKE_CLERK_JWT = process.env.SMOKE_CLERK_JWT ?? "";

const TEST_THREAD = `smoke-thread-${Date.now()}`;

async function mintAnonId(): Promise<string> {
	if (!ANON_SECRET) {
		console.error("ANON_ID_SECRET is required (must match worker .dev.vars)");
		process.exit(1);
	}
	return signAnonId(generateRawAnonId(), ANON_SECRET);
}

async function fetchTicket(jwt: string): Promise<string | null> {
	const res = await fetch(new URL("/ws-ticket", WORKER_URL), {
		method: "POST",
		headers: { authorization: `Bearer ${jwt}` }
	});
	if (!res.ok) return null;
	const body = (await res.json()) as { ticket?: string };
	return body.ticket ?? null;
}

async function call(
	method: string,
	path: string,
	opts?: { anonId?: string; ticket?: string; body?: unknown }
): Promise<{ status: number; body: unknown }> {
	const url = new URL(path, WORKER_URL);
	if (opts?.anonId) url.searchParams.set("anonId", opts.anonId);
	if (opts?.ticket) url.searchParams.set("ticket", opts.ticket);

	const bodyStr =
		opts?.body === undefined ? undefined : JSON.stringify(opts.body);
	const res = await fetch(url, {
		method,
		headers: bodyStr ? { "content-type": "application/json" } : undefined,
		body: bodyStr
	});
	const text = await res.text();
	let parsed: unknown = text;
	try {
		parsed = JSON.parse(text);
	} catch {
		// leave as raw text
	}
	return { status: res.status, body: parsed };
}

function assert(cond: unknown, label: string): void {
	if (!cond) {
		console.error(`✗ ${label}`);
		process.exit(1);
	}
	console.log(`✓ ${label}`);
}

function threadIds(body: unknown): string[] {
	if (!Array.isArray(body)) return [];
	return body.map((t) => (t as { id?: string }).id ?? "");
}

async function main() {
	console.log(`smoke target: ${WORKER_URL}`);
	const anonId = await mintAnonId();
	console.log(`anon smoke identity: signed cookie value (${anonId.slice(0, 12)}…)`);
	console.log();

	// 1. Initial list (empty or prior runs).
	const initialList = await call("GET", "/threads", { anonId });
	assert(initialList.status === 200, "GET /threads (anon) returns 200");
	assert(Array.isArray(initialList.body), "GET /threads returns an array");

	// 2. Upsert a thread.
	const upsert = await call("POST", "/threads", {
		anonId,
		body: {
			threadId: TEST_THREAD,
			title: "smoke test",
			pinned: false
		}
	});
	assert(upsert.status === 200, "POST /threads returns 200");

	// 3. List again — should see our thread.
	const listAfter = await call("GET", "/threads", { anonId });
	assert(listAfter.status === 200, "GET /threads (after upsert) returns 200");
	assert(
		threadIds(listAfter.body).includes(TEST_THREAD),
		"GET /threads sees the new thread"
	);

	// 4. Delete the thread.
	const del = await call("DELETE", `/threads/${TEST_THREAD}`, { anonId });
	assert(del.status === 204, "DELETE /threads/:id returns 204");

	// 5. Confirm gone.
	const listFinal = await call("GET", "/threads", { anonId });
	assert(
		!threadIds(listFinal.body).includes(TEST_THREAD),
		"thread no longer listed after delete"
	);

	// 6. Missing credentials are rejected.
	const noAuth = await call("GET", "/threads");
	assert(noAuth.status === 401, "GET /threads without auth returns 401");

	const claimNoAuth = await call("POST", "/threads/claim-anon");
	assert(
		claimNoAuth.status === 401,
		"POST /threads/claim-anon without auth returns 401"
	);

	const claimAnonOnly = await call("POST", "/threads/claim-anon", { anonId });
	assert(
		claimAnonOnly.status === 401,
		"POST /threads/claim-anon with anon only returns 401"
	);

	// 7. Optional: authenticated claim-anon (needs a real Clerk session JWT).
	if (SMOKE_CLERK_JWT) {
		const claimThread = `smoke-claim-${Date.now()}`;
		await call("POST", "/threads", {
			anonId,
			body: {
				threadId: claimThread,
				title: "claim me",
				pinned: false
			}
		});

		const ticket = await fetchTicket(SMOKE_CLERK_JWT);
		assert(ticket, "POST /ws-ticket returns a ticket for SMOKE_CLERK_JWT");
		const claimTicket = ticket as string;

		const claim = await call("POST", "/threads/claim-anon", {
			ticket: claimTicket,
			anonId
		});
		assert(claim.status === 200, "POST /threads/claim-anon returns 200");
		const reassigned = (claim.body as { reassigned?: number }).reassigned ?? 0;
		assert(reassigned >= 1, "claim-anon reassigned at least one row");

		const ticket2 = await fetchTicket(SMOKE_CLERK_JWT);
		assert(ticket2, "second /ws-ticket for post-claim list");
		const userList = await call("GET", "/threads", {
			ticket: ticket2 as string
		});
		assert(userList.status === 200, "GET /threads (authenticated) returns 200");
		assert(
			threadIds(userList.body).includes(claimThread),
			"claimed thread visible under authenticated user"
		);

		const ticket3 = await fetchTicket(SMOKE_CLERK_JWT);
		assert(ticket3, "third /ws-ticket for cleanup delete");
		await call("DELETE", `/threads/${claimThread}`, {
			ticket: ticket3 as string
		});
	} else {
		console.log(
			"⊘ skipping claim-anon authenticated checks (set SMOKE_CLERK_JWT to enable)"
		);
	}

	console.log("\nall smoke checks passed");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
