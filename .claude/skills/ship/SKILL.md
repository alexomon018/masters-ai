---
name: ship
description: Verify a change passes the full quality gate, then commit it on a properly named branch with a message explaining root cause and fix. Use when a fix or feature is done and ready to be saved/committed.
---

# Ship

Get verified work committed so it can't be lost or silently reverted. This exists because a lot of good fixes here were never committed — one was lost when a page reverted to a heavy query, another was reverted by a colleague, with no checkpoint to fall back on.

## Steps

1. **Verify first.** Run the full gate via the `/verify` flow (`yarn tsc`, `yarn worker:tsc`, `yarn test`, `yarn lint`), one command at a time. Do not commit anything that isn't green. If it fails, stop and fix — do not commit "WIP" over a red gate.

2. **Branch correctly.** Never commit directly to `main` or `develop`. If currently on `main`/`develop`, create a branch first using the project convention:
   - `bugfix/B{TICKET}-{name}` for fixes
   - `features/U{TICKET}-{name}` for features

   If there's no ticket number, ask for one or use a short descriptive slug.

3. **Stage deliberately.** Review `git status` and stage only the files belonging to this change. Do not blanket `git add -A` if unrelated files are dirty.

4. **Commit with a root-cause message.** The body should explain *what was wrong and why this fixes it* (the root cause), not just what changed. End the message with the required trailer:

   ```
   Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
   ```

5. **Stop there.** Do not push or open a PR unless explicitly asked.

## Rules

- Never commit secrets or env files (`.dev.vars`, `.env*` are gitignored — keep it that way).
- If the gate can't pass, report why and do not commit. A red checkpoint is worse than none.
