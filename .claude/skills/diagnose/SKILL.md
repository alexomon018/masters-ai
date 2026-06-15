---
name: diagnose
description: Confirm the root cause of a bug with evidence BEFORE applying any fix. Use when investigating a failure, error, or unexpected behavior — especially env/config issues, WebSocket/streaming bugs, or anything that has resisted a first fix.
---

# Diagnose

Find and **prove** the root cause before changing any code. This exists because the most expensive sessions on this project came from committing to a cause too early and then flip-flopping (the conflicting `.dev.vars` files, the smart-vs-straight apostrophe mismatch, the Clerk `.guru`/`.chat` domain mismatch). Speculative fixes that get reverted cost more than a slower, evidence-first pass.

## Required order — do not skip ahead

1. **Reproduce.** State the concrete command, request, or steps that trigger the failure and capture the actual failing output (error text, status code, stack, byte size). If you cannot reproduce it, say so — do not guess.
2. **Gather evidence.** Inspect the real artifacts: file contents, logs, env var values, payload/query byte sizes, decoded tokens/keys. Treat environment and config differences as first-class suspects (`.dev.vars` vs Vercel/Workers env, dev vs prod, preview vs production).
3. **State the confirmed root cause.** Write it as one sentence, citing the specific evidence that proves it. If more than one cause is plausible, list them and identify which evidence would distinguish them — then go get that evidence. Do not pick one on a hunch.
4. **Only now propose the fix.** Apply the minimal change at the correct layer.
5. **Prove it's resolved.** Re-run the reproduction from step 1 and show it now passes. Then run `/verify` (type-check, tests, lint).

## Rules

- Do not edit code in steps 1–3. Investigation only.
- Do not revise the diagnosis silently. If new evidence contradicts your stated cause, say so explicitly and restart from the evidence.
- Prefer the smallest fix that addresses the confirmed cause over a broad refactor.
