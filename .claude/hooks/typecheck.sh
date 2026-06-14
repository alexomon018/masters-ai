#!/usr/bin/env bash
# PostToolUse hook: type-check after edits so wrong-layer / broken fixes
# surface immediately instead of at the end of a session.
# Reads the hook payload on stdin, picks the right tsconfig for the edited
# file, and emits a non-blocking warning on failure.

set -euo pipefail

payload="$(cat)"

file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // ""' 2>/dev/null || true)"

case "$file_path" in
	*.ts | *.tsx) ;;
	*)
		exit 0
		;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}"

case "$file_path" in
	*/worker/* | worker/*)
		label="worker"
		cmd="yarn worker:tsc"
		;;
	*)
		label="app"
		cmd="yarn tsc"
		;;
esac

if out="$($cmd 2>&1)"; then
	exit 0
fi

# Non-blocking: report to Claude as context, don't hard-fail the edit.
{
	echo "⚠️  ${label} type-check failed after editing ${file_path}:"
	echo "$out" | tail -n 30
} >&2
exit 2
