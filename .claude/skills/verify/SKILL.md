---
name: verify
description: Run the full quality gate (type-check, tests, lint) and fix failures before declaring work done. Use after making code changes, before committing, or when asked to verify/confirm a fix works.
---

# Verify

Run the project's quality gate and do not report success until it is fully green. This exists because fixes that skipped the gate in the past got reverted or recurred (the QUERY_TOO_BIG regression, the chat stream-split bug).

## Steps

Run these from the repo root, **one at a time** (do not chain with `&&` — chained commands have been truncated before):

1. `yarn tsc` — app type-check.
2. `yarn worker:tsc` — worker type-check (only needed if worker code changed, but cheap to always run).
3. `yarn test` — unit (jsdom) + worker (workerd) vitest projects.
4. `yarn lint` — ESLint over `components hooks src lib`.

## Rules

- If any step fails, fix the cause and re-run that step before moving on. Do not proceed past a red step.
- Do not declare the task complete until all four pass. Report the actual command output for any failure — never claim green without having seen it.
- If a failure is pre-existing and unrelated to the current change, say so explicitly and show the evidence rather than silently ignoring it.
- End with a one-line summary of what passed and what (if anything) you changed to get there.
