import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";

// Worker URL the chat code reads from the environment. MSW handlers are keyed
// to this origin.
process.env.NEXT_PUBLIC_WORKER_URL = "http://localhost:8787";

// MSW lifecycle. `error` on unhandled requests surfaces accidental real
// network calls in tests instead of letting them hang.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
	cleanup();
	server.resetHandlers();
});

afterAll(() => server.close());
