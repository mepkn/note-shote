#!/usr/bin/env bash
# Runs eas-cli as the project's personal Expo account (EXPO_TOKEN from
# .eas-token) without touching the global eas login.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .eas-token ]; then
  # shellcheck disable=SC1091
  source .eas-token
fi
exec npx --yes eas-cli@latest "$@"
