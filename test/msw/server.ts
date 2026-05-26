import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Shared MSW server for the unit (jsdom) project. Lifecycle is wired in
// test/setup.unit.ts (listen / resetHandlers / close).
export const server = setupServer(...handlers);
