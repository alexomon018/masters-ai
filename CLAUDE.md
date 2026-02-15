# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev              # Start dev server (localhost:3000)
yarn build            # Production build
yarn test             # Run all Jest tests
yarn test -- --testPathPattern=path/to/test  # Run a single test file
yarn lint             # ESLint
yarn tsc              # TypeScript type-check (no emit)
yarn storybook        # Component dev (localhost:6006)
yarn db:generate      # Generate Drizzle migrations
yarn db:migrate       # Run database migrations
yarn db:studio        # Drizzle Studio GUI
```

## Architecture

Next.js 15 App Router full-stack AI chat application. Users query a RAG knowledge base built from Frontend Masters course transcripts. The app is **local-first** — all chat data lives in the browser's IndexedDB (Dexie), with optional cloud sync to Neon Postgres.

### Routing

- `/` and `/chat/<threadId>` — handled by the catch-all route `app/[[...chat]]/page.tsx` (reads `params.chat?.[1]` for thread ID)
- `/settings/<tab>` — tab-based settings (`app/settings/[tab]/page.tsx`)
- `/auth` — Clerk sign-in page
- `/api/masters` — main RAG streaming endpoint
- `/api/sync` — bidirectional cloud sync (GET/POST/DELETE)
- `/api/name-thread`, `/api/user-info`, `/api/delete-user` — supporting endpoints

### Key Directories

- `ai/` — LLM config, RAG chat setup (Upstash RAG Chat SDK), system prompts
- `components/` — **Atomic Design**: `atoms/`, `molecules/`, `organisms/` with barrel exports via `index.ts`
- `lib/` — server-side: Drizzle ORM schema/queries (`schema.ts`, `queries.ts`), Redis client, migrations
- `localdb/` — Dexie IndexedDB schema (tables: projects, threads, messages)
- `store/` — Zustand store for model selection preferences (persisted to localStorage)
- `providers/` — React context providers (theme, model store, query client)
- `constants/` — model definitions, Zod validation schemas, query keys, routes

### Data Flow

```
Browser (Dexie IndexedDB) ← primary data store
    ↕ optional sync
Neon Postgres (Drizzle ORM) ← cloud backup, SuperJSON serialization
Upstash Redis ← message quotas (24h TTL), RAG session history
Upstash Vector ← transcript embeddings for RAG retrieval
```

### State Management

- **Zustand** — global model preferences, persisted to localStorage with custom Set serializer (`store/modelStore.ts`)
- **Dexie live queries** — reactive UI updates from IndexedDB (`dexie-react-hooks`)
- **TanStack Query** — server state (sync, quotas); QueryClientProvider scoped per-page, not in root layout
- **Vercel AI SDK** — `useChat` hook for streaming chat via `/api/masters`

### Auth

Clerk auth via `middleware.ts`. Public routes: `/`, `/chat/*`, `/api/masters`, `/api/user-info`. Protected: `/settings/*`. Anonymous users tracked by IP with lower message quotas (10/day vs 20/day authenticated). User metadata in `user.unsafeMetadata` personalizes RAG prompts.

## Path Aliases (tsconfig.json)

`@atoms`, `@molecules`, `@organisms` → `components/*/`, plus `@utils`, `@lib`, `@hooks`, `@constants`, `@store`, `@providers`, `@ai`, `@types`, `@icons`, `@images`, `@app`

## Code Conventions

- **Formatting**: Prettier with tabs, no trailing commas, double quotes, 80 char width, tailwindcss plugin
- **Linting**: ESLint 9 — airbnb + airbnb-typescript + tailwindcss + sonarjs + jsx-a11y + prettier
- **Components**: arrow function components; organisms co-locate a `use<Name>.ts` hook file alongside the component for logic separation
- **Error handling**: `tryCatch` utility (`utils/tryCatch.ts`) returns `{ data, error, success }` — used across all API routes instead of try/catch
- **Logging**: structured JSON logger (`utils/logger.ts`) with typed static methods for server-side events
- **API validation**: all request bodies validated with Zod schemas before processing

## Git Workflow

- **Pre-commit (Husky)**: runs `npm test`, then lint-staged (prettier on all files, eslint --fix on `src/**/*.{ts,tsx}`)
- **Branch naming**: `bugfix/B{TICKET_ID}-{name}`, `features/U{TICKET_ID}-{name}`
- **CI (GitHub Actions)**: on PR to `main` — `yarn test` → `yarn lint` → `yarn build`
