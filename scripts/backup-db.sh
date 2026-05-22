#!/bin/bash

# ============================================================
# SaaS Listing Platform — Production Database Backup Script
# ============================================================

# Load environment variables
# Expects: POSTGRES_USER, POSTGRES_DB, POSTGRES_PASSWORD, R2_BUCKET_NAME, R2_ENDPOINT_URL
set -e

BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="backup-${POSTGRES_DB}-${DATE}.sql.gz"
LATEST_LINK="${BACKUP_DIR}/backup-latest.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

# Execute pg_dump inside Docker container or locally depending on context
# Exports to gzipped SQL file
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -h "${DB_HOST:-postgres}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-saas_platform}" | gzip > "${BACKUP_DIR}/${FILENAME}"

# Update latest symlink
ln -sf "${BACKUP_DIR}/${FILENAME}" "$LATEST_LINK"

echo "[$(date)] Backup completed successfully: ${BACKUP_DIR}/${FILENAME}"

# ── Cloudflare R2 Upload (Rclone / AWS CLI) ─────────────────
if [ -n "$R2_BUCKET_NAME" ] && [ -n "$R2_ENDPOINT_URL" ]; then
  echo "[$(date)] Uploading backup to Cloudflare R2..."
  # Example AWS CLI configuration to target Cloudflare R2 endpoint
  aws s3 cp "${BACKUP_DIR}/${FILENAME}" "s3://${R2_BUCKET_NAME}/db-backups/${FILENAME}" \
    --endpoint-url "${R2_ENDPOINT_URL}" \
    --no-progress
  echo "[$(date)] R2 Upload completed successfully."
fi

# ── Retention Policy (7 Days Rotation) ──────────────────────
echo "[$(date)] Running retention cleanup (removing backups older than 7 days)..."
find "$BACKUP_DIR" -type f -name "backup-*.sql.gz" -mtime +7 -delete
echo "[$(date)] Cleanup completed."
