# Masters AI — Next.js + Cloudflare Worker AI Chat

A RAG chat app grounded in Frontend Masters course transcripts. The Next.js front end handles UI, auth, and account management; a Cloudflare Worker (one Durable Object per thread) runs the agent loop and streams responses back over a WebSocket.

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
Browser
   │
   ├── POST /ws-ticket   ─▶ Cloudflare Worker (Clerk JWT → single-use ticket)
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
   ├── HTTP /threads* ───▶ D1 thread index
   ├── HTTP /users/me ───▶ Cascade-delete on account removal
   │
   ├── /api/name-thread ─▶ Anthropic Haiku 4.5 (auto-titles new threads)
   ├── /api/user-info   ─▶ Reads Redis quota counter for the current identity
   └── /api/delete-user ─▶ Cascade on worker, then Clerk user delete
```

- **The browser talks directly to the Worker over a WebSocket** using `useAgent` + `useAgentChat`. Tool calls arrive as `UIMessage` parts (`tool-ragSearch`) with a live state, so the UI renders an inline "ragSearch ⏳ → ✓" pill while the agent runs.
- **Home → thread handoff** uses `window.history.replaceState('/chat/<id>')` (ChatGPT / Claude.ai pattern). No `router.push`, no remount, no pending-message stash. Same React tree throughout.
- **Identity** survives Durable Object hibernation: it's stashed on `connection.state` (which is backed by the WebSocket attachment), not on `this`.
- **No Next.js proxy for chat.** There's no `/api/masters`; chat traffic is browser-to-Worker only.

## Models

The selectable lineup lives in [`constants/models.tsx`](constants/models.tsx) and is validated by [`constants/llmValidationSchema.ts`](constants/llmValidationSchema.ts):

| Model              | Provider  | When to use                                   |
| ------------------ | --------- | --------------------------------------------- |
| Claude Haiku 4.5   | Anthropic | Default — fast, cheap, near-frontier          |
| Claude Sonnet 4.6  | Anthropic | Best speed/intelligence balance               |
| GPT-5.5            | OpenAI    | Strongest answers, higher cost/latency        |
| GPT-5.4            | OpenAI    | Mid-tier OpenAI                               |
| GPT-5.4 mini       | OpenAI    | Fastest OpenAI option                         |

Adding or removing a model is three files: the union in [`types/Model.ts`](types/Model.ts), the Zod enum in [`constants/llmValidationSchema.ts`](constants/llmValidationSchema.ts), and the provider switch in [`worker/src/providers.ts`](worker/src/providers.ts). The worker switch is exhaustive — TypeScript will fail compilation if a new id is added but not wired.

## Auth & security

- **Authenticated users**: browser POSTs the Clerk JWT to `/ws-ticket` (Authorization header) and receives a single-use 30-second ticket. Subsequent requests pass `?ticket=...`. Clerk JWTs never appear in URLs (no access-log leakage).
- **Anonymous users**: Next.js middleware issues an HMAC-signed cookie `masters_anon_id` (format `<rawId>.<sig>`). Browser passes the cookie value as `?anonId=...`. The worker rejects unsigned / tampered values. Signature is HMAC-SHA256 with `ANON_ID_SECRET`, shared between middleware and worker.
- **Per-thread access control**: every `/agents/*` request checks D1 for ownership of the thread id. First-claim semantics — an unclaimed thread id (no D1 row yet) is accepted to let the home page's eager-connect work; the first successful submit writes the D1 row, locking the thread.
- **Daily quota**: 10 messages/day anon, 20 authenticated. Counter lives in Upstash Redis, keyed by `user:<id>` or `anon:<rawId>`.
- **CORS**: the worker reflects only origins listed in `ALLOWED_ORIGINS`. Next.js API routes are same-origin only.
- **Account deletion** (`/api/delete-user`): cascades to the worker via `DELETE /users/me` (drops every D1 row + DO history for the user), wipes Redis quota counters, then deletes the Clerk user.
- **CSP**: locked-down content-security-policy ships on every Next.js response. See [`next.config.mjs`](next.config.mjs).

## Getting started

```bash
git clone https://github.com/yourusername/masters-ai.git
cd masters-ai
yarn install

# 1. Generate a shared HMAC secret for the anon cookie:
openssl rand -base64 32

# 2. Put it in .env.local (Next.js side) AND worker/.dev.vars (Worker side)
#    as ANON_ID_SECRET. They MUST match.
cp .env.example .env.local

# 3. In one terminal:
yarn worker:dev      # http://localhost:8787

# 4. In another:
yarn dev             # http://localhost:3000
```

`NEXT_PUBLIC_WORKER_URL` points the browser at the dev worker (`http://localhost:8787`). The worker independently needs its own secrets in `worker/.dev.vars`.

## Environment variables

### Next.js (`.env.local`)

```dotenv
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_WORKER_URL="http://localhost:8787"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."
CLERK_SECRET_KEY="..."
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL="http://localhost:3000"

# Upstash Redis (quota + ticket store + naming rate limit)
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# Anthropic — used by /api/name-thread for thread titles
ANTHROPIC_API_KEY="..."

# Shared HMAC secret for the anon cookie. MUST match the worker.
ANON_ID_SECRET="..."
```

### Worker (`worker/.dev.vars`, or `wrangler secret put` for prod)

```dotenv
CLERK_SECRET_KEY="..."
OPENAI_API_KEY="..."
ANTHROPIC_API_KEY="..."
UPSTASH_VECTOR_REST_URL="..."
UPSTASH_VECTOR_REST_TOKEN="..."
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# Shared HMAC secret for the anon cookie. MUST match Next.js.
ANON_ID_SECRET="..."

# Comma-separated browser origins permitted for CORS.
ALLOWED_ORIGINS="http://localhost:3000,https://masters-ai.vercel.app"
```

## Project structure

```
ai/llm.ts              # Anthropic Haiku 4.5 — thread auto-naming only
app/
  page.tsx             # Home — mints thread id, eager-connects, replaceState on submit
  chat/[id]/page.tsx   # Direct-link / refresh entry for an existing thread
  settings/[tab]/      # Clerk-protected user settings
  api/name-thread/     # Anthropic-backed title generation (Clerk-gated, rate-limited)
  api/user-info/       # Quota read
  api/delete-user/     # Cascade-delete + Clerk user remove
components/            # Atomic design: atoms / molecules / organisms
  organisms/Chat/
    Chat.tsx           # Layout + scroll behavior
    useChat.ts         # Composer of useAgent + useAgentChat + sub-hooks
    hooks/             # useAutoNameThread, useQuotaInvalidation
    helpers/           # resolveAgentAuth, autoNameThread
constants/             # Models, validation schemas, query keys, routes
lib/redis.ts           # Upstash Redis (Next.js side)
middleware.ts          # Clerk + signed anon cookie issuance
providers/             # Theme, model store, query client
store/                 # Zustand model preferences
utils/
  anonId.ts            # HMAC-signed anon id (mirrored in worker/src)
  tryCatch.ts          # Result-style error wrapper
worker/                # Cloudflare Worker — owns the chat agent
  src/
    worker.ts          # Entry, CORS, route dispatch
    agent.ts           # MastersChatAgent DO (identity on connection.state)
    agent-core.ts      # streamAgent / runAgent (shared between WS + eval)
    auth-ticket.ts     # Issue/redeem single-use WS tickets
    clerk-auth.ts      # Resolve ?ticket=/?anonId= → identity
    thread-access.ts   # Per-thread D1 ownership check
    providers.ts       # Strict LLMModel → provider switch
    quota.ts           # Daily message quota
    tools/rag-search.ts# Upstash Vector retrieval
    routes/threads.ts  # D1 thread index handlers + cascade delete
    anonId.ts          # Verifier — mirrors utils/anonId.ts
  wrangler.jsonc       # DO binding, D1 binding, secrets
```

## Scripts

```bash
# Next.js
yarn dev                yarn build              yarn start
yarn lint               yarn tsc                yarn test
yarn storybook          yarn build-storybook    yarn chromatic

# Worker
yarn worker:dev              yarn worker:deploy           yarn worker:tsc
yarn worker:deploy:preview   yarn worker:smoke
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
