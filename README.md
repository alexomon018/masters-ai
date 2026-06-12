# Masters AI — Vite SPA + Cloudflare Worker AI Chat

A RAG chat app grounded in Frontend Masters course transcripts. A Vite single-page app (React + TanStack Router, deployed as static assets to Vercel) handles the UI; a Cloudflare Worker (one Durable Object per thread) owns the chat agent and all server logic. There is no server runtime on the front end — it builds to static assets in `dist/`.

## Table of Contents

- [Architecture](#architecture)
- [Models](#models)
- [Auth & security](#auth--security)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Branch conventions](#branch-conventions)
- [License](#license)

## Architecture

```
Browser (Vite SPA)
   │
   ├── POST /ws-ticket   ─▶ Cloudflare Worker (Clerk JWT → single-use 30s ticket)
   │
   ├── WebSocket ────────▶ Cloudflare Worker
   │                         ├─ onBeforeConnect: ticket / anonId → userId
   │                         ├─ checkThreadAccess: D1 ownership
   │                         └─ MastersChatAgent (Durable Object, 1 per thread)
   │                               ├─ identity on connection.state (survives hibernation)
   │                               ├─ Upstash Redis (per-day quota)
   │                               ├─ Upstash Vector (RAG)
   │                               └─ streamAgent → toUIMessageStreamResponse()
   │
   ├── HTTP /threads*  ──▶ D1 thread index (list, create, delete, claim-anon)
   ├── HTTP /anon-id   ──▶ Mint HMAC-signed anon id (replaces the old Next.js cookie)
   ├── HTTP /usage     ──▶ Daily message quota for the caller
   ├── HTTP /name-thread ▶ Anthropic Haiku 4.5 (auto-titles new threads)
   └── HTTP /users/me  ──▶ Cascade-delete on account removal (D1 + DO + Redis + Clerk)
```

- **The browser talks directly to the Worker over a WebSocket** using `useAgent` + `useAgentChat`. Tool calls arrive as `UIMessage` parts (`tool-ragSearch`) with a live state, so the UI renders an inline "ragSearch ⏳ → ✓" pill while the agent runs.
- **Home → thread handoff** keeps the router in sync: a single persistent `<Chat>` lives in the pathless `_chat` layout and is rendered above the route outlet for both `/` and `/chat/$id`. On the first message `useChat` calls `navigate({ to: "/chat/$id", params, replace: true })`. The `<Chat>` is keyed by thread id and the navigation lands on that same id, so the key is unchanged and the live agent connection survives the URL swap (no remount). Keeping the router in sync — vs a raw `history.replaceState` — is what makes a later "New Chat" a real transition.
- **Identity** survives Durable Object hibernation: it's stashed on `connection.state` (backed by the WebSocket attachment), not on `this`.
- **No front-end server runtime for chat.** Chat traffic is browser-to-Worker only; the Worker owns every server surface.

## Models

The selectable lineup lives in [`constants/models.tsx`](constants/models.tsx) and is validated by [`constants/llmValidationSchema.ts`](constants/llmValidationSchema.ts):

| Model              | Provider  | When to use                                   |
| ------------------ | --------- | --------------------------------------------- |
| Claude Haiku 4.5   | Anthropic | Default — fast, cheap, near-frontier          |
| Claude Sonnet 4.6  | Anthropic | Best speed/intelligence balance               |
| GPT-5.5            | OpenAI    | Strongest answers, higher cost/latency        |
| GPT-5.4            | OpenAI    | Mid-tier OpenAI                               |
| GPT-5.4 mini       | OpenAI    | Fastest OpenAI option                         |

Adding or removing a model is three files: the union in [`types/Model.ts`](types/Model.ts), the Zod enum in [`constants/llmValidationSchema.ts`](constants/llmValidationSchema.ts), and the provider switch in [`worker/src/providers.ts`](worker/src/providers.ts). The worker switch is exhaustive — TypeScript will fail compilation if a new id is added but not wired. Unknown model labels from old browsers fall back to `claude-haiku-4-5` with a server-side warning.

## Auth & security

- **Authenticated users**: browser POSTs the Clerk JWT to `/ws-ticket` (Authorization header) and receives a single-use 30-second ticket. Subsequent requests pass `?ticket=...`. Clerk JWTs never appear in URLs (no access-log leakage).
- **Anonymous users**: the browser requests `GET /anon-id` from the worker, which mints an HMAC-signed anon id (format `<rawId>.<sig>`) and stores it in `localStorage`. The browser passes the value as `?anonId=...`. The worker rejects unsigned / tampered values. Signature is HMAC-SHA256 with `ANON_ID_SECRET`. `GET /anon-id` is rate-limited per IP (20 mints/day) so clearing localStorage doesn't reset the anon quota for free.
- **Per-thread access control**: every `/agents/*` request checks D1 for ownership of the thread id. An unclaimed thread id (no D1 row yet) is accepted at connect time to let the home page's eager-connect work; the DO claims the thread in D1 on the first chat message, locking it to the caller. A thread id with rows under more than one user is treated as contested and denied for everyone.
- **Daily quota**: 10 messages/day anon, 20 authenticated. Counter lives in Upstash Redis, keyed by `user:<id>` or `anon:<rawId>`.
- **CORS**: the worker reflects only origins listed in `ALLOWED_ORIGINS`.
- **Account deletion** (`DELETE /users/me`): cascades on the worker — drops every D1 row + DO history for the user, wipes Redis quota counters, then deletes the Clerk identity. Called directly by the SPA with a ticket.

## Getting started

```bash
git clone https://github.com/yourusername/masters-ai.git
cd masters-ai
yarn install

# 1. Generate a shared HMAC secret for the anon id:
openssl rand -base64 32

# 2. Put it in .env (front-end build) AND worker/.dev.vars (Worker side)
#    as ANON_ID_SECRET. They MUST match.
cp .env.example .env

# 3. In one terminal:
yarn worker:dev      # http://localhost:8787

# 4. In another:
yarn dev             # http://localhost:3000
```

`VITE_WORKER_URL` points the browser at the dev worker (`http://localhost:8787`). The worker independently needs its own secrets in `worker/.dev.vars`.

## Environment variables

### Front end (`.env` — Vite, so `VITE_`-prefixed and public)

```dotenv
VITE_WORKER_URL="http://localhost:8787"

# Clerk — dashboard.clerk.com
VITE_CLERK_PUBLISHABLE_KEY="..."

# Optional Clerk Frontend API proxy.
# VITE_CLERK_PROXY_URL="https://clerk.femasters.guru"
```

All server-only secrets (`CLERK_SECRET_KEY`, `ANTHROPIC_API_KEY`, `UPSTASH_*`, `ANON_ID_SECRET`) live only on the worker — the SPA has no server runtime.

### Worker (`worker/.dev.vars`, or `wrangler secret put` for prod)

```dotenv
CLERK_SECRET_KEY="..."
OPENAI_API_KEY="..."
ANTHROPIC_API_KEY="..."
UPSTASH_VECTOR_REST_URL="..."
UPSTASH_VECTOR_REST_TOKEN="..."
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# Shared HMAC secret for the anon id. MUST match the front end.
ANON_ID_SECRET="..."

# Comma-separated browser origins permitted for CORS.
ALLOWED_ORIGINS="http://localhost:3000,https://masters-ai.vercel.app"
```

## Project structure

```
src/                      # Vite SPA entry
  main.tsx                # Router bootstrap
  routes/                 # File-based TanStack Router routes
    __root.tsx            # Provider stack (Clerk, theme, model store, query)
    _chat.tsx             # Pathless layout — single persistent <Chat> for / and /chat/$id
    _chat.index.tsx       # / (new chat — mints a thread id)
    _chat.chat.$id.tsx    # /chat/$id (v4-UUID guard in beforeLoad)
    auth.tsx              # Clerk sign-in
    settings/             # Clerk-protected user settings
  routeTree.gen.ts        # Generated — do not edit
ai/llm.ts                 # Anthropic Haiku 4.5 — lingers for evals (naming runs in the worker)
components/               # Atomic design: atoms / molecules / organisms
  organisms/Chat/
    Chat.tsx              # Layout + scroll behavior
    useChat.ts            # Composer of useAgent + useAgentChat + sub-hooks
    hooks/                # useAutoNameThread, useQuotaInvalidation
    helpers/              # resolveAgentAuth, getAnonId, autoNameThread, workerHttpBase
constants/                # models.tsx, llmValidationSchema.ts, query keys, routes
providers/                # Theme, model store, query client
store/                    # Zustand model preferences (persisted to localStorage)
utils/
  anonId.ts               # HMAC-signed anon id (mirrored in worker/src)
  tryCatch.ts             # Result-style error wrapper
worker/                   # Cloudflare Worker — owns the chat agent + all server logic
  src/
    worker.ts             # Entry, CORS, route dispatch
    agent.ts              # MastersChatAgent DO (identity on connection.state)
    agent-core.ts         # streamAgent / runAgent (shared between WS + eval)
    auth-ticket.ts        # Issue/redeem single-use WS tickets
    clerk-auth.ts         # Resolve ?ticket=/?anonId= → identity
    thread-access.ts      # Per-thread D1 ownership check
    providers.ts          # Strict LLMModel → provider switch
    quota.ts              # Daily message quota
    redis.ts              # Shared Upstash REST pipeline helper
    tools/rag-search.ts   # Upstash Vector retrieval
    routes/               # threads, usage, name-thread, anon-id REST handlers
    anonId.ts             # Verifier — mirrors utils/anonId.ts
  wrangler.jsonc          # DO binding, D1 binding, secrets
```

## Scripts

```bash
# Front end (Vite)
yarn dev                yarn build              yarn preview
yarn lint               yarn tsc                yarn test
yarn test:watch         yarn test:cov
yarn storybook          yarn build-storybook    yarn chromatic

# Worker
yarn worker:dev              yarn worker:deploy           yarn worker:tsc
yarn worker:deploy:preview   yarn worker:smoke

# D1 migrations
yarn db:d1:generate
yarn db:d1:migrate:local
yarn db:d1:migrate:dev:remote
yarn db:d1:migrate:prod:remote
```

## Branch conventions

- Bug fixes: `bugfix/B{TICKET_ID}-{short-name}`
- Features:  `features/U{TICKET_ID}-{short-name}`

## License

MIT.
