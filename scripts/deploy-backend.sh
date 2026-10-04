#!/usr/bin/env bash
# Deploys convex/ to the production Convex deployment decisive-mockingbird-534 (project "note-shote").
# Needs CONVEX_DEPLOY_KEY in .env.prod.local (git-ignored).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.prod.local ]; then
  echo "Missing .env.prod.local. Copy .env.example and fill in CONVEX_DEPLOY_KEY." >&2
  exit 1
fi
# Read KEY=VALUE lines literally (values such as deploy keys contain "|", so the
# file is not sourced as shell). Surrounding quotes are stripped.
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|\#*) continue ;; esac
  key="${line%%=*}"
  value="${line#*=}"
  value="${value%\"}"; value="${value#\"}"; value="${value%\'}"; value="${value#\'}"
  export "$key=$value"
done < .env.prod.local
: "${CONVEX_DEPLOY_KEY:?CONVEX_DEPLOY_KEY is not set in .env.prod.local}"
# .env.local points `convex` at the local dev backend; don't let it win.
unset CONVEX_DEPLOYMENT

echo "› Checks"
npm run check

echo "› Deploying to production"
npx convex deploy -y
