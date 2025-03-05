import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function DELETE() {
	const user = await currentUser();

	const userId = user?.id;

	if (!userId) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	try {
		const client = await clerkClient();
		await client.users.deleteUser(userId);
		return NextResponse.json({ message: "User deleted" });
	} catch (error) {
		console.log(error);
		return NextResponse.json({ error: "Error deleting user" });
	}
}
