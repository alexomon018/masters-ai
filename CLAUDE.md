# CLAUDE.md

Guidance for Claude Code working in this repository.

## Commands

```bash
yarn dev              # Next.js dev server (localhost:3000)
yarn build            # Production build
yarn test             # Vitest — unit (jsdom) + worker (workerd) projects
yarn test:watch       # Vitest watch mode
yarn test:cov         # Vitest with coverage (unit project only; worker runs in yarn test)
yarn test path/to/file.test.ts  # run a single test file
yarn lint             # ESLint
yarn tsc              # Type-check Next.js (no emit)
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

Next.js 15 App Router front end + a Cloudflare Worker (Durable Object per thread) that owns the chat agent. RAG over Frontend Masters course transcripts. Chat traffic is direct browser → Worker over WebSocket; no Next.js chat proxy.

### Routing

- `app/page.tsx` — home (`/`). Mints a fresh thread id on mount, hands it to `<Chat isNewThread />`. The agent connection opens eagerly to that id.
- `app/chat/[id]/page.tsx` — thread page. Direct-link / refresh entry point.
- `app/settings/[tab]/page.tsx` — Clerk-protected settings.
- `app/auth/` — Clerk sign-in.
- `app/api/name-thread`, `app/api/user-info`, `app/api/delete-user` — supporting endpoints.

**Home → thread handoff** uses `window.history.replaceState('/chat/<id>')` (ChatGPT/Claude.ai pattern). Same React tree throughout — no `router.push`, no remount, no pending-message stash. The URL update plays nicely with `usePathname` per the Next.js App Router docs.

### Worker surfaces

- `POST /ws-ticket` — exchange a Clerk JWT (Authorization header) for a single-use 30s ticket. Keeps bearer tokens out of URLs.
- `GET/POST /threads`, `DELETE /threads/:id`, `POST /threads/claim-anon` — thread index (D1). `claim-anon` re-keys anon rows to the signed-in Clerk user (ticket + `anonId` query).
- `DELETE /users/me` — cascade-delete every D1 row + DO history for the caller. Called by `app/api/delete-user`.
- `/agents/masters-chat-agent/<threadId>` — WebSocket upgrade + REST (`get-messages`). Routed by `routeAgentRequest`.

### Auth

Two identities, resolved by `worker/src/clerk-auth.ts`:

- `user:<clerk-id>` via `?ticket=...` (exchanged from a Clerk JWT)
- `anon:<rawId>` via `?anonId=<HMAC-signed cookie value>` (cookie issued by `middleware.ts`, signed with `ANON_ID_SECRET`)

Anything else is rejected with a generic `401 Unauthorized` (details logged server-side only).

**Per-thread access control** (`worker/src/thread-access.ts`): every `/agents/*` request also checks D1 for thread ownership. Unclaimed thread ids pass through (first-claim semantics — the home page's eager-connect runs before D1 has a row); claimed thread ids must match the caller's userId.

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
  ├── HTTP /threads          → D1 thread index
  ├── HTTP /ws-ticket        → Upstash Redis (single-use tickets, 30s TTL)
  └── HTTP Next.js /api/*    → Clerk session, Anthropic Haiku (naming)
```

Chat history lives in the per-thread DO's SQLite (`maxPersistedMessages = 200`). The D1 index only stores metadata (id, title, pinned, timestamps). There is no Postgres / Dexie cloud sync anymore.

### Key directories

- `ai/` — `llm.ts` only. Anthropic Haiku 4.5 used by `/api/name-thread` for thread titles. **The chat agent lives in `worker/`.**
- `components/` — atomic design: `atoms/`, `molecules/`, `organisms/`, all with barrel exports.
- `components/organisms/Chat/` — `Chat.tsx`, `useChat.ts`, plus:
  - `hooks/usePendingFirstMessage` is gone — the pending-message bridge was removed when we adopted `history.replaceState`.
  - `hooks/useAutoNameThread.ts` — auto-titles new threads via `/api/name-thread`.
  - `hooks/useQuotaInvalidation.ts` — bumps the quota query on both streaming edges.
  - `helpers/agentAuth.ts` — single `resolveAgentAuth(getToken)` resolver (returns `{ ticket }` or `{ anonId }`).
  - `helpers/autoNameThread.ts` — POST to `/api/name-thread`, write title via `upsertThreadRemote`.
- `constants/models.tsx` — model lineup (Anthropic Haiku/Sonnet, OpenAI 5.4/5.4-mini/5.5).
- `constants/llmValidationSchema.ts` — Zod enum for the model lineup + `/api/name-thread` body shape.
- `lib/redis.ts` — Upstash Redis client (Next.js side; the worker has its own).
- `middleware.ts` — Clerk + issues/verifies the HMAC-signed anon cookie.
- `providers/` — theme, model store, query client.
- `store/` — Zustand model preferences (persisted to localStorage).
- `utils/anonId.ts` — anon-id signer/verifier (mirrored in `worker/src/anonId.ts`).
- `worker/src/` — Worker package:
  - `worker.ts` — entry, CORS, route dispatch.
  - `agent.ts` — `MastersChatAgent` DO. Identity on `connection.state` (hibernation-safe).
  - `agent-core.ts` — shared `streamAgent` / `runAgent`.
  - `auth-ticket.ts` — issue/redeem single-use tickets in Redis.
  - `clerk-auth.ts` — resolve `?ticket=` / `?anonId=` to identity.
  - `thread-access.ts` — per-thread ownership check.
  - `providers.ts` — strict `LLMModel` → provider switch. No legacy aliases.
  - `quota.ts` — daily quota (10 anon / 20 authed).
  - `tools/rag-search.ts` — Upstash Vector RAG.
  - `routes/threads.ts` — D1 thread index handlers.
  - `anonId.ts` — mirror of `utils/anonId.ts`.

### State management

- **Zustand** (`store/modelStore.ts`) — global model preference, persisted to localStorage with a custom Set serializer.
- **TanStack Query** — server state (threads list, message quota). `QueryClientProvider` scoped per-page, not in root layout.
- **`useAgentChat`** (`@cloudflare/ai-chat/react`) — provides `messages: UIMessage[]`, `sendMessage`, `status`, `stop`. The chat hook composes this with `useAgent` from `agents/react`.

### Models

Single source of truth on each side; they must stay in lockstep:

- Next.js: `types/Model.ts` (`LLMModel` union), `constants/llmValidationSchema.ts` (Zod enum), `constants/models.tsx` (UI cards).
- Worker: `worker/src/providers.ts` (`LLMModel` union + provider switch).

Unknown model labels from old browsers fall back to `claude-haiku-4-5` with a server-side warning (`resolveWorkerModelLabel`). There is no legacy-alias map.

## Path aliases (tsconfig.json)

`@atoms`, `@molecules`, `@organisms` → `components/*/`. Plus `@utils`, `@lib`, `@constants`, `@store`, `@providers`, `@ai`, `@types`, `@icons`, `@images`, `@app`.

## Required environment variables

### Next.js (`.env.local`)

- `NEXT_PUBLIC_WORKER_URL` — e.g. `http://localhost:8787` in dev.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (quota counters + naming rate limits).
- `ANTHROPIC_API_KEY` (thread auto-naming).
- `ANON_ID_SECRET` — shared HMAC secret. **MUST match the worker's value.**

### Worker (`worker/.dev.vars` / `wrangler secret put`)

- `CLERK_SECRET_KEY`.
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.
- `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- `ANON_ID_SECRET` — same value as Next.js.
- `ALLOWED_ORIGINS` — comma-separated browser origins permitted for CORS. e.g. `http://localhost:3000,https://masters-ai.vercel.app`.

## Code conventions

- **Formatting**: Prettier, tabs, no trailing commas, double quotes, 80 char width.
- **Linting**: ESLint 9 — airbnb + airbnb-typescript + tailwindcss + sonarjs + jsx-a11y + prettier.
- **Components**: arrow function components. Organisms co-locate `use<Name>.ts` for logic.
- **Error handling**: `tryCatch` utility (`utils/tryCatch.ts`) returns `{ data, error, success }` — used across API routes instead of try/catch.
- **API validation**: all request bodies validated with Zod before processing.
- **Auth error responses**: generic `401 Unauthorized` externally; detailed reasons logged server-side only.

## Git workflow

- **Pre-commit** (Husky + lint-staged): prettier on all files, eslint --fix on `src/**/*.{ts,tsx}`, vitest on changed files.
- **Branches**: `bugfix/B{TICKET}-{name}`, `features/U{TICKET}-{name}`.
- **CI** (GitHub Actions): on PR to `main` — `yarn test` → `yarn lint` → `yarn build`.
