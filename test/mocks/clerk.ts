import { vi } from "vitest";

// Reusable Clerk mock shapes for the unit project. Tests call
// `vi.mock("@clerk/nextjs", ...)` at the top of the file and use these
// factories to control auth state per-case.
//
// Usage:
//   vi.mock("@clerk/nextjs", () => clerkClientMock({ token: "jwt" }));

export interface ClerkMockOptions {
	// JWT returned by getToken(); null = anonymous (no token).
	token?: string | null;
	// unsafeMetadata for useUser().user; undefined = signed out.
	user?: Record<string, unknown> | null;
}

export function clerkClientMock({ token = null, user = null }: ClerkMockOptions = {}) {
	return {
		useAuth: () => ({
			getToken: vi.fn(async () => token),
			isSignedIn: Boolean(token),
			userId: token ? "user_test" : null
		}),
		useUser: () => ({
			user: user ? { unsafeMetadata: user } : null,
			isSignedIn: Boolean(user),
			isLoaded: true
		})
	};
}

// Server-side counterpart for app/api route tests: mock
// `@clerk/nextjs/server`'s currentUser() / auth().
export interface ClerkServerMockOptions {
	userId?: string | null;
	token?: string | null;
}

export function clerkServerMock({
	userId = null,
	token = null
}: ClerkServerMockOptions = {}) {
	return {
		currentUser: vi.fn(async () => (userId ? { id: userId } : null)),
		auth: vi.fn(async () => ({
			userId,
			getToken: vi.fn(async () => token)
		}))
	};
}
