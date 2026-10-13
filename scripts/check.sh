#!/usr/bin/env bash
# Runs every part's checks: the backend's typecheck, lint and tests, then the
# Expo app's and the web app's. Run before committing.
set -euo pipefail
cd "$(dirname "$0")/.."

for dir in backend mobile web; do
  echo "› $dir"
  npm --prefix "$dir" run check
done
