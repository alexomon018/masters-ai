#!/usr/bin/env bash
# Push worker secrets to Cloudflare (preview or production).
#
# Reads worker/.dev.vars first, then falls back to repo-root .env for any
# key that is missing or empty in .dev.vars.
#
# Usage:
#   ./scripts/sync-worker-secrets.sh preview
#   ./scripts/sync-worker-secrets.sh production
#
# Requires: yarn wrangler logged in, secrets in worker/.dev.vars and/or .env

set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-preview}"
if [[ "$TARGET" != "preview" && "$TARGET" != "production" ]]; then
	echo "Usage: $0 [preview|production]" >&2
	exit 1
fi

if [[ ! -f worker/.dev.vars && ! -f .env ]]; then
	echo "Missing worker/.dev.vars and .env — add secrets to at least one" >&2
	exit 1
fi

# Read KEY=value from a dotenv file (no sourcing — avoids shell quirks).
read_env_var() {
	local name="$1"
	local file="$2"
	local line val
	[[ -f "$file" ]] || return 1
	line="$(grep -E "^${name}=" "$file" | tail -1 || true)"
	[[ -n "$line" ]] || return 1
	val="${line#*=}"
	val="${val%$'\r'}"
	# Strip optional surrounding quotes.
	if [[ "$val" == \"*\" && "$val" == *\" ]]; then
		val="${val:1:${#val}-2}"
	elif [[ "$val" == \'*\' && "$val" == *\' ]]; then
		val="${val:1:${#val}-2}"
	fi
	[[ -n "$val" ]] || return 1
	printf '%s' "$val"
}

get_secret() {
	local name="$1"
	local val=""
	val="$(read_env_var "$name" worker/.dev.vars 2>/dev/null || true)"
	if [[ -z "$val" ]]; then
		val="$(read_env_var "$name" .env 2>/dev/null || true)"
	fi
	printf '%s' "$val"
}

SECRETS=(
	ANON_ID_SECRET
	CLERK_SECRET_KEY
	OPENAI_API_KEY
	ANTHROPIC_API_KEY
	UPSTASH_VECTOR_REST_URL
	UPSTASH_VECTOR_REST_TOKEN
	UPSTASH_REDIS_REST_URL
	UPSTASH_REDIS_REST_TOKEN
)

echo "Syncing worker secrets to Cloudflare env: $TARGET"
echo "(worker/.dev.vars first, then .env for any missing key)"
echo ""

uploaded=0
for name in "${SECRETS[@]}"; do
	val="$(get_secret "$name")"
	if [[ -z "$val" ]]; then
		echo "skip $name (empty in worker/.dev.vars and .env)" >&2
		continue
	fi
	echo "→ $name"
	printf '%s' "$val" | yarn wrangler secret put "$name" --env "$TARGET"
	uploaded=$((uploaded + 1))
done

echo ""
if [[ "$uploaded" -eq 0 ]]; then
	echo "Nothing uploaded. Copy worker/.dev.vars.example → worker/.dev.vars" >&2
	echo "or add the keys above to .env, then re-run." >&2
	exit 1
fi

echo "Uploaded $uploaded secret(s). No redeploy needed — retry chat in preview."
