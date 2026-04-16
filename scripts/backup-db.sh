#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

DATABASE_URL="$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)"

if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is missing in $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/postgres-$TIMESTAMP.dump"

echo "Creating backup at $BACKUP_FILE.gz"
pg_dump --format=custom --file="$BACKUP_FILE" "$DATABASE_URL"
gzip "$BACKUP_FILE"

find "$BACKUP_DIR" -type f -name '*.dump.gz' -mtime +"$RETENTION_DAYS" -delete

echo "Backup complete."
