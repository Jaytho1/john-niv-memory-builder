#!/usr/bin/env bash

set -euo pipefail

APP_NAME="john-memory-app"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # GitHub Actions SSH sessions do not load interactive shell startup files.
  # Load NVM so npm and PM2 resolve to the same Node install as production.
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
  nvm use --silent default
fi

cd "$APP_DIR"

echo "Installing production dependencies..."
npm ci --omit=dev --ignore-scripts

echo "Auditing production dependencies..."
npm audit --omit=dev --audit-level=high

echo "Reloading PM2 app..."
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --only "$APP_NAME"
else
  pm2 start ecosystem.config.cjs --only "$APP_NAME"
fi

APP_PORT="${PORT:-43117}"
if [[ -f "$APP_DIR/.env" ]]; then
  ENV_PORT="$(grep '^PORT=' "$APP_DIR/.env" | cut -d= -f2- || true)"
  APP_PORT="${ENV_PORT:-$APP_PORT}"
fi

echo "Checking local app health..."
curl --fail --silent --show-error "http://127.0.0.1:${APP_PORT}/health" >/dev/null

echo "Saving PM2 process list..."
pm2 save

echo "Deployment complete."
