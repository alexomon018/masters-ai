---
name: env-audit
description: Audit environment variables and config across the SPA, the Cloudflare Worker, and evals to catch missing keys, conflicting .dev.vars files, and Clerk domain mismatches. Use when env/config is suspected, before a deploy, or when auth/CORS/API-key errors appear.
---

# Env Audit

Find config drift across this project's three env surfaces before it turns into a multi-session debugging chase. The recurring failures here were conflicting `.dev.vars` files, empty prod env vars, CORS/CSP misconfig, and a Clerk publishable-key domain that didn't match the deploy target.

## The three env surfaces

1. **SPA (Vite)** — public `VITE_`-prefixed vars, defined in `.env` / `.env.local` locally and in the Vercel project env for prod. Expected: `VITE_WORKER_URL`, `VITE_CLERK_PUBLISHABLE_KEY` (and optional `VITE_CLERK_PROXY_URL`). See `.env.example`.
2. **Worker** — server secrets in `worker/.dev.vars` locally and `wrangler secret` / wrangler env for prod. Expected set: `CLERK_SECRET_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ANON_ID_SECRET`, `ALLOWED_ORIGINS`, plus `BRAINTRUST_API_KEY`/`INTERNAL_SHARED_SECRET` if present. See `worker/.dev.vars.example`.
3. **Evals** — `yarn eval` loads `dotenv -e .dev.vars -e .env`, i.e. the **root** `.dev.vars` (Anthropic/OpenAI/Braintrust + judge config), which is a *different file* from `worker/.dev.vars`.

## Checks to run

- **Conflicting `.dev.vars` (known footgun).** There can be a root `./.dev.vars` (for evals) AND a `worker/.dev.vars` (for the worker). Confirm both exist on purpose and that any key shared between them (e.g. `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `BRAINTRUST_API_KEY`) holds the *same* value. A stale duplicate in the root file silently shadows the worker's value during evals — flag any divergence.
- **Missing keys.** Diff each live file against its `.example` and against the references in code (`import.meta.env.*` for SPA, `env.*` in `worker/src` for worker). Report keys that are referenced but unset, and keys present locally but absent from the example.
- **Clerk domain match.** Decode the `VITE_CLERK_PUBLISHABLE_KEY` (base64 after the `pk_test_`/`pk_live_` prefix → the Frontend API domain) and confirm it matches the intended environment. A `pk_test_` key in prod, or a key whose domain doesn't match the deploy target, was a real bug here.
- **CORS.** Confirm the worker's `ALLOWED_ORIGINS` includes the SPA origin actually being used (localhost in dev, the Vercel domain in prod).
- **Prod presence.** For prod issues, check that Vercel project env vars and `wrangler secret list` are actually populated — empty prod vars have caused failures.

## Rules

- **Never print secret values.** Report key *names*, whether they're set/missing, and whether two files *agree* (same/different) — not the values themselves. Decoding the Clerk *publishable* key (public by design) to read its domain is fine.
- Produce a single diff report of all discrepancies first; propose fixes second. Do not edit env files without confirmation.
