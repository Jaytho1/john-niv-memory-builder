#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/restore-db.sh /path/to/backup.dump.gz" >&2
  exit 1
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
BACKUP_ARCHIVE="$1"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$BACKUP_ARCHIVE" ]]; then
  echo "Backup file not found: $BACKUP_ARCHIVE" >&2
  exit 1
fi

DATABASE_URL="$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)"

if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is missing in $ENV_FILE" >&2
  exit 1
fi

RESTORE_FILE="$TEMP_DIR/restore.dump"

echo "Decompressing backup..."
gzip -dc "$BACKUP_ARCHIVE" > "$RESTORE_FILE"

echo "Restoring database from $BACKUP_ARCHIVE"
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$RESTORE_FILE"

echo "Restore complete."
