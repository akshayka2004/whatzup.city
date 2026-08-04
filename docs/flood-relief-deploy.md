# Deploying the Kerala Flood Relief Portal to the VPS

Covers first-time production setup for `apps/flood-relief-api` and `apps/flood-relief-web`,
plus the changes to `apps/launch-page`. Local repo changes are already committed and pushed
(`4c80cfa` on `main`). Everything below runs **on the VPS**, over SSH.

## Database decision: self-hosted on the same VPS

Chose self-hosted Postgres over the shared Supabase DB. Reasoning:

- **Scalability**: not a concern — this is a low-traffic civic info portal (alerts, camps,
  contacts), nowhere near the write/read volume that would stress a single Postgres instance
  on a modest VPS.
- **Security, if done right** (steps below cover this): bind to `localhost` only — never
  expose 5432 publicly — dedicated low-privilege role scoped to one database, and an
  automated backup cron. That closes the two real risks (public exposure, data loss).
- **Why *not* the shared Supabase DB**: the SaaS platform's `pnpm db:reset` **TRUNCATES all
  tables** in that database (by design, for clean dev-state resets). Putting flood-relief
  tables in the same database would mean a routine dev command could wipe flood-relief data
  with zero relation to what it's meant to reset. Keeping it fully separate — which is also
  why `apps/flood-relief-api`'s Prisma scripts are named `prisma:*`, not `db:*` — was a
  deliberate structural choice to make that impossible, not just unlikely.

## 1. SSH in and locate the repo

```bash
ssh <user>@<vps-ip>
cd /path/to/whatzup.city   # wherever this repo is checked out on the VPS
```

## 2. Install and harden PostgreSQL (skip if already installed)

```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib

# Bind to localhost only — never expose 5432 to the public internet
sudo sed -i "s/^#\?listen_addresses.*/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf
sudo systemctl restart postgresql

# Confirm the firewall has no public rule for 5432 (there shouldn't be one if
# listen_addresses is localhost-only, but check explicitly)
sudo ufw status | grep 5432   # expect no output
```

Create the dedicated role and database (least privilege — this role only has access to its
own database, nothing else on the instance):

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE kfr_user LOGIN PASSWORD 'REPLACE_WITH_A_STRONG_GENERATED_PASSWORD';
CREATE DATABASE kerala_flood_relief OWNER kfr_user;
REVOKE ALL ON DATABASE kerala_flood_relief FROM PUBLIC;
GRANT ALL PRIVILEGES ON DATABASE kerala_flood_relief TO kfr_user;
SQL
```

Generate the password with `openssl rand -base64 32` — don't hand-type something guessable.

## 3. Automated backups

Minimum baseline — daily dump, 14-day local retention:

```bash
sudo mkdir -p /var/backups/kerala-flood-relief
sudo tee /etc/cron.daily/kerala-flood-relief-backup > /dev/null <<'SCRIPT'
#!/bin/bash
set -euo pipefail
STAMP=$(date +%F)
pg_dump -U kfr_user -h localhost kerala_flood_relief \
  | gzip > /var/backups/kerala-flood-relief/kfr-$STAMP.sql.gz
find /var/backups/kerala-flood-relief -name '*.sql.gz' -mtime +14 -delete
SCRIPT
sudo chmod +x /etc/cron.daily/kerala-flood-relief-backup
```

This only protects against local mistakes (bad migration, accidental delete), not disk/VPS
loss — for real durability, periodically copy `/var/backups/kerala-flood-relief/` off the
box (rsync to another machine, or upload to whatever object storage you already use). Set
that up once you've picked where; not something I can wire up blind.

## 4. Pull the code and install

```bash
git pull origin main
pnpm install
```

## 5. Configure `apps/flood-relief-api/.env` (production secrets — never committed)

```bash
cat > apps/flood-relief-api/.env <<'ENV'
NODE_ENV=production
PORT=4002
DATABASE_URL="postgresql://kfr_user:REPLACE_WITH_THE_PASSWORD_FROM_STEP_2@localhost:5432/kerala_flood_relief?schema=public"
JWT_SECRET=REPLACE_WITH_A_NEW_SECRET_NEVER_REUSE_THE_SAAS_PLATFORMS
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://floodrelief.whtzup.city
SEED_ADMIN_NAME="Portal Administrator"
SEED_ADMIN_EMAIL=admin@keralafloodrelief.gov.in
SEED_ADMIN_PASSWORD=REPLACE_WITH_A_REAL_PASSWORD_BEFORE_SEEDING
ENV
```

Generate the JWT secret with `openssl rand -hex 48`. **Change `SEED_ADMIN_PASSWORD` before
running the seed step** — don't ship the dev default to production.

## 6. Build

```bash
pnpm --filter @saas/flood-relief-api run build
pnpm --filter @saas/flood-relief-web run build
```

## 7. Apply the database schema and seed the first admin

```bash
pnpm --filter @saas/flood-relief-api run prisma:deploy   # applies migrations, non-interactive
pnpm --filter @saas/flood-relief-api run prisma:seed     # creates the admin user + sample data
```

## 8. Start/reload PM2

`ecosystem.config.js` already has the new `saas-flood-relief-api` entry and the updated
`saas-launch-page` entry (new `FLOOD_RELIEF_URL`/`MARKETPLACE_URL` env vars) from the
pushed commit.

```bash
pm2 reload ecosystem.config.js --only saas-flood-relief-api,saas-launch-page
pm2 save
```

(`saas-launch-page` needs a reload too — its `server.ts` and `package.json` changed.)

## 9. nginx

**Verify first**: is `docker/nginx/default.conf` (in this repo) actually the file nginx
reads on this VPS, or is the live config hand-written elsewhere? If it's this file:

```bash
sudo cp docker/nginx/default.conf /etc/nginx/sites-available/whatzup.city   # or wherever it lives
sudo nginx -t                          # validate before reloading
sudo systemctl reload nginx
```

If the live config is elsewhere, add the `floodrelief.${DOMAIN}` server block from
`docker/nginx/default.conf` (the block proxies `/api/` to `127.0.0.1:4002` and serves
`apps/flood-relief-web/dist` as static files) into that file instead, adjusting the `root`
path to match where this repo actually lives on the VPS.

## 10. DNS

Add an A (or CNAME) record: `floodrelief.whtzup.city` → this VPS's IP, same as your
existing `api.`/`app.` records.

## 11. TLS

Once DNS has propagated:

```bash
sudo certbot --nginx -d floodrelief.whtzup.city
```

## 12. Verify

```bash
curl https://floodrelief.whtzup.city/api/health
# {"success":true,"message":"Kerala Flood Relief Portal API is running"}
```

Then in a browser:
- `https://floodrelief.whtzup.city` — home page loads with seeded data
- `https://floodrelief.whtzup.city/admin/login` — log in with the seed admin credentials
- The hub page (wherever `saas-launch-page` is reachable) — both buttons route correctly
