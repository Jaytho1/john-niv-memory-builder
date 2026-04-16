#!/usr/bin/env bash

set -euo pipefail

APP_NAME="john-memory-app"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$APP_DIR"

echo "Installing production dependencies..."
npm ci --omit=dev

echo "Reloading PM2 app..."
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --only "$APP_NAME"
else
  pm2 start ecosystem.config.cjs --only "$APP_NAME"
fi

echo "Saving PM2 process list..."
pm2 save

echo "Deployment complete."
