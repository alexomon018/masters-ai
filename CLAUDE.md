# CLAUDE.md

Guidance for Claude Code working in this repository.

## Commands

```bash
yarn dev              # Vite dev server (localhost:3000)
yarn build            # Vite production build (-> dist/)
yarn preview          # Serve the production build locally
yarn test             # Vitest — unit (jsdom) + worker (workerd) projects
yarn test:watch       # Vitest watch mode
yarn test:cov         # Vitest with coverage (unit project only; worker runs in yarn test)
yarn test path/to/file.test.ts  # run a single test file
yarn lint             # ESLint (components src lib)
yarn tsc              # Type-check (no emit)
yarn storybook        # Component dev (localhost:6006)

yarn worker:dev              # Cloudflare Worker locally (localhost:8787)
yarn worker:deploy           # Deploy production Worker (--env production)
yarn worker:deploy:preview   # Deploy preview Worker (--env preview)
yarn worker:tsc              # Type-check the worker package
yarn worker:smoke            # Worker smoke tests

yarn db:d1:generate             # Generate Drizzle migrations for D1
yarn db:d1:migrate:local        # Apply migrations to local D1 (masters-dev)
yarn db:d1:migrate:dev:remote   # Apply migrations to remote masters-dev
yarn db:d1:migrate:prod:remote  # Apply migrations to remote masters-prod
```

## Architecture

Vite SPA (React + TanStack Router, deployed static to Vercel) front end + a Cloudflare Worker (Durable Object per thread) that owns the chat agent and all server logic. RAG over Frontend Masters course transcripts. Chat traffic is direct browser → Worker over WebSocket. There is no server runtime on the front end — it builds to static assets in `dist/`.

### Routing

File-based TanStack Router under `src/routes/` (tree generated to `src/routeTree.gen.ts` by `@tanstack/router-plugin`):

- `src/routes/_chat.tsx` — pathless layout owning a single persistent `<Chat>` for both `/` and `/chat/$id`. It derives the thread id from the route param, or mints one when on `/` (new chat). Rendering Chat above the route outlet is what lets the home→thread URL swap happen without remounting the chat tree.
- `src/routes/_chat.index.tsx` (`/`) and `src/routes/_chat.chat.$id.tsx` (`/chat/$id`, v4-UUID guard in `beforeLoad`) — empty matches; the layout renders Chat.
- `src/routes/settings/{route,index,$tab}.tsx` — settings layout (client-side signed-in guard via `useUser`), index redirect, tab content.
- `src/routes/auth.tsx` — Clerk sign-in.
- `src/routes/__root.tsx` — provider stack (Clerk via `@clerk/clerk-react`, theme, model store, query) wrapping the router `Outlet`.

**Home → thread handoff**: on the first message `useChat` calls `navigate({ to: "/chat/$id", params, replace: true })`. The persistent `<Chat>` in the `_chat` layout is keyed by thread id and the navigation lands on that same id, so the key is unchanged and the live agent connection survives the URL change (no remount). Keeping the router in sync — vs a raw `history.replaceState` — is what makes a later "New Chat" a real transition.

### Worker surfaces

- `POST /ws-ticket` — exchange a Clerk JWT (Authorization header) for a single-use 30s ticket. Keeps bearer tokens out of URLs.
- `GET /anon-id` — mint a fresh HMAC-signed anon id (replaces the old Next middleware cookie; the SPA stores it in localStorage).
- `GET /usage` — daily message usage for the caller (was Next `GET /api/user-info`).
- `POST /name-thread` — auto-title a thread via Haiku (was Next `POST /api/name-thread`); 100/day rate limit.
- `GET/POST /threads`, `DELETE /threads/:id`, `POST /threads/claim-anon` — thread index (D1). `claim-anon` re-keys anon rows to the signed-in Clerk user (ticket + `anonId` query).
- `DELETE /users/me` — cascade-delete every D1 row + DO history, wipe Redis quota, and delete the Clerk identity for the caller (self-contained; called directly by the SPA with a ticket).
- `/agents/masters-chat-agent/<threadId>` — WebSocket upgrade + REST (`get-messages`). Routed by `routeAgentRequest`.

### Auth

Two identities, resolved by `worker/src/clerk-auth.ts`:

- `user:<clerk-id>` via `?ticket=...` (exchanged from a Clerk JWT)
- `anon:<rawId>` via `?anonId=<HMAC-signed value>` (minted by the worker `GET /anon-id`, stored in localStorage, signed with `ANON_ID_SECRET`)

Anything else is rejected with a generic `401 Unauthorized` (details logged server-side only).

**Per-thread access control** (`worker/src/thread-access.ts`): every `/agents/*` request also checks D1 for thread ownership. Unclaimed thread ids pass through at connect time (the home page's eager-connect runs before D1 has a row), but the DO claims the thread in D1 on the first chat message (`claimThread`), so a thread never holds history while unclaimed. Claimed thread ids must match the caller's userId; a thread id with rows under more than one user is treated as contested and denied for everyone, and `POST /threads` refuses a thread id owned by another user. `GET /anon-id` is rate-limited per IP (20 mints/day) so clearing localStorage doesn't reset the anon quota for free.

### Data flow

```
Browser
  ├── WS  → Cloudflare Worker
  │          ├── onBeforeConnect: ticket/anonId → userId
  │          ├── checkThreadAccess: D1 ownership check
  │          └── MastersChatAgent DO (per-thread SQLite)
  │                ├── identity stashed on connection.state (survives hibernation)
  │                ├── Upstash Redis: per-day message quota
  │                └── Upstash Vector: RAG retrieval
  │
  ├── HTTP /threads                  → D1 thread index
  ├── HTTP /ws-ticket                → Upstash Redis (single-use tickets, 30s TTL)
  └── HTTP /usage /name-thread /anon-id /users/me → quota, Anthropic Haiku (naming), anon-id mint, account delete
```

Chat history lives in the per-thread DO's SQLite (`maxPersistedMessages = 200`). The D1 index only stores metadata (id, title, pinned, timestamps). There is no Postgres / Dexie cloud sync anymore.

### Key directories

- `src/` — Vite SPA entry: `main.tsx` (router bootstrap), `routes/` (file-based routes), `index.css` + `globals.css`, `vite-env.d.ts`. `routeTree.gen.ts` is generated — do not edit.
- `components/` — atomic design: `atoms/`, `molecules/`, `organisms/`, all with barrel exports.
- `components/organisms/Chat/` — `Chat.tsx`, `useChat.ts`, plus:
  - `hooks/useAutoNameThread.ts` — auto-titles new threads via the worker `/name-thread`.
  - `hooks/useQuotaInvalidation.ts` — bumps the quota query on both streaming edges.
  - `helpers/agentAuth.ts` — `resolveAgentAuth(getToken)` (returns `{ ticket }` or `{ anonId }`), `getAnonId` (localStorage + worker mint), `workerHttpBase`.
  - `helpers/autoNameThread.ts` — POST to the worker `/name-thread`, write title via `upsertThreadRemote`.
- `constants/models.tsx` — model lineup (Anthropic Haiku, OpenAI 5.4-mini).
- `providers/` — theme, model store, query client. Storybook decorators live in `withThemeProvider.tsx` and are **not** re-exported from the barrel (keeps Storybook out of the app bundle).
- `store/` — Zustand model preferences (persisted to localStorage).
- `utils/anonId.ts` — anon-id signer/verifier (mirrored in `worker/src/anonId.ts`).
- `worker/src/` — Worker package (owns all server logic):
  - `worker.ts` — entry, CORS, route dispatch.
  - `agent.ts` — `MastersChatAgent` DO. Identity on `connection.state` (hibernation-safe).
  - `agent-core.ts` — shared `streamAgent` / `runAgent`.
  - `auth-ticket.ts` — issue/redeem single-use tickets in Redis (`@clerk/backend` verifyToken).
  - `clerk-auth.ts` — resolve `?ticket=` / `?anonId=` to identity.
  - `thread-access.ts` — per-thread ownership check.
  - `providers.ts` — strict `LLMModel` → provider switch. No legacy aliases.
  - `quota.ts` — daily quota (10 anon / 20 authed).
  - `redis.ts` — shared Upstash REST pipeline helper.
  - `routes/{threads,usage,name-thread,anon-id}.ts` — REST handlers (thread index, usage, naming, anon-id mint).
  - `tools/rag-search.ts` — Upstash Vector RAG.
  - `anonId.ts` — mirror of `utils/anonId.ts` (sign + verify).

### State management

- **Zustand** (`store/modelStore.ts`) — global model preference, persisted to localStorage with a custom Set serializer.
- **TanStack Query** — server state (threads list, message quota). `QueryClientProvider` is provided once at the root route (`src/routes/__root.tsx`).
- **`useAgentChat`** (`@cloudflare/ai-chat/react`) — provides `messages: UIMessage[]`, `sendMessage`, `status`, `stop`. The chat hook composes this with `useAgent` from `agents/react`.

### Models

Single source of truth on each side; they must stay in lockstep:

- Front end: `types/Model.ts` (`LLMModel` union), `constants/llmValidationSchema.ts` (Zod enum), `constants/models.tsx` (UI cards).
- Worker: `worker/src/providers.ts` (`LLMModel` union + provider switch).

Unknown model labels from old browsers fall back to `claude-haiku-4-5` with a server-side warning (`resolveWorkerModelLabel`). There is no legacy-alias map.

## Path aliases (tsconfig.json)

`@atoms`, `@molecules`, `@organisms` → `components/*/`. Plus `@utils`, `@lib`, `@constants`, `@store`, `@providers`, `@types`, `@icons`, `@images`, and `@/*` → repo root. Resolved by Vite's native `resolve.tsconfigPaths` (app) and Vitest's `resolve.tsconfigPaths` (tests).

## Required environment variables

### Front end (`.env` / Vercel project env — Vite, so `VITE_`-prefixed and public)

- `VITE_WORKER_URL` — e.g. `http://localhost:8787` in dev.
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key.
- `VITE_CLERK_PROXY_URL` — optional Clerk Frontend API proxy.

All server-only secrets (`CLERK_SECRET_KEY`, `ANTHROPIC_API_KEY`, `UPSTASH_*`, `ANON_ID_SECRET`) now live only on the worker — the SPA has no server runtime.

### Worker (`worker/.dev.vars` / `wrangler secret put`)

- `CLERK_SECRET_KEY`.
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.
- `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- `ANON_ID_SECRET` — HMAC secret for minting/verifying anon ids (worker-only now).
- `ALLOWED_ORIGINS` — comma-separated browser origins permitted for CORS. e.g. `http://localhost:3000,https://masters-ai.vercel.app`.
- `KEY_ENCRYPTION_SECRET` — AES-GCM master secret for encrypting BYOK provider keys at rest in D1 (`user_api_keys`). Rotating it invalidates all stored user keys.

## Code conventions

- **Formatting**: Prettier, tabs, no trailing commas, double quotes, 80 char width.
- **Linting**: ESLint 9 — airbnb + airbnb-typescript + tailwindcss + sonarjs + jsx-a11y + prettier.
- **Components**: arrow function components. Organisms co-locate `use<Name>.ts` for logic.
- **Error handling**: `tryCatch` utility (`utils/tryCatch.ts`) returns `{ data, error, success }` — used across worker route handlers instead of try/catch.
- **API validation**: all request bodies validated with Zod before processing.
- **Auth error responses**: generic `401 Unauthorized` externally; detailed reasons logged server-side only.

## Git workflow

- **Pre-commit** (Husky + lint-staged): prettier on all files, eslint --fix on `src/**/*.{ts,tsx}`, vitest on changed files.
- **Branches**: `bugfix/B{TICKET}-{name}`, `features/U{TICKET}-{name}`.
- **CI** (GitHub Actions): on PR to `main` — `yarn test` → `yarn lint` → `yarn build`.

When generating code, please avoid comments to explain the code. If it is not obvious, please add a comment.
