import { vi } from "vitest";

export interface ClerkMockOptions {
	token?: string | null;
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
