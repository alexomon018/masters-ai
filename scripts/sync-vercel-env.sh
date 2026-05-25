#!/usr/bin/env bash
# Sync Next.js env vars from .env to Vercel (masters-ai project).
# Worker secrets stay in worker/.dev.vars + `wrangler secret put`.
#
# Usage: ./scripts/sync-vercel-env.sh
# Requires: vercel CLI logged in, project linked (`vercel link`).

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
	echo "Missing .env in repo root" >&2
	exit 1
fi

# Strip CRLF (Windows) line endings before sourcing.
# shellcheck disable=SC1091
set -a
source <(sed 's/\r$//' .env)
set +a

PREVIEW_WORKER_URL="${PREVIEW_WORKER_URL:-https://masters-ai-agent-preview.aleksa-mitic5859.workers.dev}"
PROD_WORKER_URL="${PROD_WORKER_URL:-https://masters-ai-agent.aleksa-mitic5859.workers.dev}"
PROD_APP_URL="${PROD_APP_URL:-https://femasters.guru}"

put() {
	local name="$1"
	local value="$2"
	shift 2
	for target in "$@"; do
		echo "→ $name ($target)"
		vercel env add "$name" "$target" --value "$value" --force --yes >/dev/null
	done
}

echo "Syncing to Vercel project masters-ai…"
echo ""

# Shared across Development, Preview, Production
for name in \
	CLERK_SECRET_KEY \
	NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
	ANON_ID_SECRET \
	UPSTASH_REDIS_REST_URL \
	UPSTASH_REDIS_REST_TOKEN \
	ANTHROPIC_API_KEY; do
	val="${!name:-}"
	if [[ -z "$val" ]]; then
		echo "skip $name (empty in .env)" >&2
		continue
	fi
	put "$name" "$val" development preview production
done

if [[ -n "${ENABLE_LOGGING:-}" ]]; then
	put ENABLE_LOGGING "$ENABLE_LOGGING" development preview production
fi

# Worker URL — per Vercel environment
put NEXT_PUBLIC_WORKER_URL "$PREVIEW_WORKER_URL" development preview
put NEXT_PUBLIC_WORKER_URL "$PROD_WORKER_URL" production

# Clerk redirects — localhost for local `vercel dev`, prod URLs for deployed envs
put NEXT_PUBLIC_CLERK_SIGN_UP_URL "${NEXT_PUBLIC_CLERK_SIGN_UP_URL:-http://localhost:3000/auth}" development
put NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL "${NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL:-http://localhost:3000/chat}" development

put NEXT_PUBLIC_CLERK_SIGN_UP_URL "$PROD_APP_URL/auth" preview production
put NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL "$PROD_APP_URL/chat" preview production

echo ""
echo "Done. Verify: vercel env ls"
echo ""
echo "Set preview worker secrets (use yarn, not bare wrangler):"
echo "  yarn wrangler secret put ALLOWED_ORIGINS --env preview"
echo ""
echo "Worker preview ALLOWED_ORIGINS (wrangler.jsonc preview.vars, or secret):"
echo "  http://localhost:3000"
echo "  $PROD_APP_URL"
echo "  https://*.vercel.app"
echo ""
echo "If preview still 401/CORS after deploy, delete the preview secret so vars apply:"
echo "  yarn wrangler secret delete ALLOWED_ORIGINS --env preview"
echo ""
echo "Redeploy or push a branch to pick up NEXT_PUBLIC_* changes."
