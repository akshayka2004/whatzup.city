#!/usr/bin/env bash
# ============================================================
# Off-site backup of the production (Supabase) database.
# ============================================================
# Independent of Supabase's own backups: a nightly pg_dump of the app schema,
# encrypted, kept locally for 14 days and copied to Cloudflare R2 / S3 when
# configured. Restore steps: docs/ops-edge-and-origin.md ("Backups").
#
# Cron (VPS, 02:30 IST):
#   30 21 * * * cd /root/saas-listing-platform && bash scripts/backup-db.sh >> /var/log/whtzup-backup.log 2>&1
#
# Reads from the environment, or the repo-root .env:
#   DIRECT_URL              Postgres URL that bypasses pgbouncer (Supabase "direct"
#                           or "session" connection). Falls back to DATABASE_URL.
#   BACKUP_PASSPHRASE       Required. Symmetric GPG passphrase; store it outside the VPS too.
#   BACKUP_DIR              Default /var/backups/whtzup
#   BACKUP_SCHEMAS          Default "public" (space-separated)
#   R2_BUCKET_NAME, R2_ENDPOINT_URL   Optional off-site copy via the aws CLI
#                           (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY from R2).
# Needs pg_dump at least as new as the server (Supabase: PostgreSQL 15+/17).
set -euo pipefail
cd "$(dirname "$0")/.."

env_value() {
  # Value of $1 from .env without sourcing it (values may contain shell characters).
  [ -f .env ] || return 0
  grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'
}

DB_URL="${DIRECT_URL:-$(env_value DIRECT_URL)}"
DB_URL="${DB_URL:-${DATABASE_URL:-$(env_value DATABASE_URL)}}"
PASSPHRASE="${BACKUP_PASSPHRASE:-$(env_value BACKUP_PASSPHRASE)}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/whtzup}"
SCHEMAS="${BACKUP_SCHEMAS:-public}"

if [ -z "$DB_URL" ]; then
  echo "[$(date)] ERROR: no DIRECT_URL / DATABASE_URL" >&2
  exit 1
fi
if [ -z "$PASSPHRASE" ]; then
  echo "[$(date)] ERROR: BACKUP_PASSPHRASE is not set; refusing to write an unencrypted dump" >&2
  exit 1
fi
# Prisma-only query parameters (pgbouncer, connection_limit) are invalid for libpq.
DB_URL="${DB_URL%%\?*}?sslmode=require"

umask 077
mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y-%m-%d_%H-%M)
FILE="$BACKUP_DIR/whtzup-${STAMP}.dump.gpg"

schema_args=()
for s in $SCHEMAS; do schema_args+=(--schema="$s"); done

echo "[$(date)] Dumping schemas: $SCHEMAS"
pg_dump "$DB_URL" --format=custom --compress=6 --no-owner --no-privileges "${schema_args[@]}" \
  | gpg --batch --yes --symmetric --cipher-algo AES256 \
      --passphrase-fd 3 3<<<"$PASSPHRASE" --output "$FILE"

# A dump that fails half-way still produces a (short) file; check it opens.
gpg --batch --quiet --passphrase-fd 3 3<<<"$PASSPHRASE" --decrypt "$FILE" \
  | pg_restore --list >/dev/null
echo "[$(date)] Backup OK: $FILE ($(du -h "$FILE" | cut -f1))"

if [ -n "${R2_BUCKET_NAME:-}" ] && [ -n "${R2_ENDPOINT_URL:-}" ]; then
  aws s3 cp "$FILE" "s3://${R2_BUCKET_NAME}/db-backups/$(basename "$FILE")" \
    --endpoint-url "$R2_ENDPOINT_URL" --no-progress
  echo "[$(date)] Copied off-site to R2"
fi

find "$BACKUP_DIR" -type f -name 'whtzup-*.dump.gpg' -mtime +14 -delete
