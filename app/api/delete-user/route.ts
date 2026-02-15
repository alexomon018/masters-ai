import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { tryCatch } from "@/utils";

export async function DELETE() {
	const user = await currentUser();

	if (!user?.id) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	const { data: client } = await tryCatch(clerkClient());

	if (!client) {
		return NextResponse.json(
			{ error: "Failed to initialize Clerk client" },
			{ status: 500 }
		);
	}

	const { error: deleteError } = await tryCatch(
		client.users.deleteUser(user.id)
	);

	if (deleteError) {
		// eslint-disable-next-line no-console
		console.error("Error deleting user:", deleteError);
		return NextResponse.json({ error: "Error deleting user" }, { status: 500 });
	}

	return NextResponse.json({ message: "User deleted" });
}
