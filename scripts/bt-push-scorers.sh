#!/usr/bin/env bash
# Push online scorers to Braintrust.
#
# Braintrust's function runtime only accepts Node 18/20/21/22 and derives the
# version from the node running the push, so pin a supported one via nvm when
# the local default (e.g. 24.x) is unsupported.
set -euo pipefail

SUPPORTED_MAJORS="18 20 21 22"
current_major="$(node -v | sed -E 's/^v([0-9]+)\..*/\1/')"

if ! echo "$SUPPORTED_MAJORS" | grep -qw "$current_major"; then
	if [ -s "$HOME/.nvm/nvm.sh" ]; then
		# shellcheck disable=SC1091
		. "$HOME/.nvm/nvm.sh"
		nvm use 22 >/dev/null 2>&1 || nvm use 20 >/dev/null 2>&1 || true
	fi
fi

current_major="$(node -v | sed -E 's/^v([0-9]+)\..*/\1/')"
if ! echo "$SUPPORTED_MAJORS" | grep -qw "$current_major"; then
	echo "Braintrust push needs Node 18/20/21/22, found $(node -v)." >&2
	echo "Install one (e.g. 'nvm install 22') and retry." >&2
	exit 1
fi

exec npx dotenv -e .dev.vars -e .env -- braintrust push --if-exists replace evals/online/scorers.ts
