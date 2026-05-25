import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { tryCatch } from "@/utils";
import redis from "@/lib/redis";

// Account deletion is irreversible and must clean up everything tied to
// the user before Clerk removes the identity. Order matters:
//   1. Cascade-delete on the worker (D1 thread rows + per-thread DO
//      history). Done BEFORE the Clerk delete so the worker can still
//      authenticate the request — once Clerk drops the user, the JWT is
//      invalid and the cascade endpoint would 401.
//   2. Best-effort wipe of per-user Redis quota counters.
//   3. Clerk user delete (irreversible; do last).
async function cascadeDeleteOnWorker(token: string): Promise<boolean> {
	const base = process.env.NEXT_PUBLIC_WORKER_URL;
	if (!base) return true;
	const worker = base.replace(/\/$/, "");
	try {
		// 1. Exchange the Clerk JWT for a single-use ticket (Authorization
		//    header, not URL — keeps the bearer out of access logs).
		const ticketRes = await fetch(`${worker}/ws-ticket`, {
			method: "POST",
			headers: { authorization: `Bearer ${token}` }
		});
		if (!ticketRes.ok) return false;
		const { ticket } = (await ticketRes.json()) as { ticket?: string };
		if (!ticket) return false;

		// 2. Cascade-delete via that ticket.
		const res = await fetch(
			`${worker}/users/me?ticket=${encodeURIComponent(ticket)}`,
			{ method: "DELETE" }
		);
		return res.ok;
	} catch {
		return false;
	}
}

async function wipeUserQuota(userId: string): Promise<void> {
	try {
		await redis.del(`message_count:user:${userId}`);
		await redis.del(`name_thread_count:user:${userId}`);
	} catch {
		// Best-effort. Keys expire after 24h anyway.
	}
}

export async function DELETE() {
	const { userId, getToken } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	const token = await getToken();
	if (!token) {
		return NextResponse.json(
			{ error: "Could not obtain session token" },
			{ status: 500 }
		);
	}

	const cascadeOk = await cascadeDeleteOnWorker(token);
	if (!cascadeOk) {
		// Don't proceed with the Clerk delete — leaving orphan D1 rows that
		// nobody can ever access again is worse than failing the operation.
		return NextResponse.json(
			{ error: "Failed to delete account data. Please try again." },
			{ status: 500 }
		);
	}

	await wipeUserQuota(userId);

	const { data: client } = await tryCatch(clerkClient());
	if (!client) {
		return NextResponse.json(
			{ error: "Failed to initialize Clerk client" },
			{ status: 500 }
		);
	}

	const { error: deleteError } = await tryCatch(client.users.deleteUser(userId));
	if (deleteError) {
		// eslint-disable-next-line no-console
		console.error("Error deleting user:", deleteError);
		return NextResponse.json({ error: "Error deleting user" }, { status: 500 });
	}

	return NextResponse.json({ message: "User deleted" });
}
