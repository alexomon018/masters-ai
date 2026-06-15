#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

run_model() {
	local model="$1"
	echo "==> eval:chat (${model})"
	EVAL_CHAT_MODEL="$model" dotenv -e .dev.vars -e .env -- \
		braintrust eval evals/chat-agent.eval.ts
}

run_model "claude-haiku-4-5"
run_model "gpt-5.4-mini"
