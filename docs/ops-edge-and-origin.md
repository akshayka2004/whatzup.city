# Edge, origin and operations runbook (Cloudflare, nginx, VPS, Supabase)

Infrastructure steps from the October 2026 audits that can't be made from the
codebase. Each is a few minutes in the Cloudflare dashboard, on the VPS or in
Supabase. After deploying the deep-review batch (23 October), work through them in
order.

## 1. Cache public pages at Cloudflare

Public pages already send `Cache-Control: s-maxage=120, stale-while-revalidate`
and the HTML is identical for every visitor (sign-in state is applied in the
browser), but Cloudflare does not cache HTML by default (`cf-cache-status: DYNAMIC`).
Phone TTFB on the home page was 0.9–1.6 s; an edge hit is about 50 ms.

Cloudflare dashboard → the `whtzup.city` zone → **Caching → Cache Rules → Create rule**:

- **Name:** Public pages
- **When incoming requests match** (custom filter expression):

  ```
  (http.host eq "platform.whtzup.city")
  and not starts_with(http.request.uri.path, "/api/")
  and not starts_with(http.request.uri.path, "/dashboard")
  and not starts_with(http.request.uri.path, "/admin")
  and not starts_with(http.request.uri.path, "/super-admin")
  and not starts_with(http.request.uri.path, "/staff")
  and not starts_with(http.request.uri.path, "/profile")
  and not starts_with(http.request.uri.path, "/account")
  and not starts_with(http.request.uri.path, "/register")
  and not starts_with(http.request.uri.path, "/login")
  and http.request.method eq "GET"
  ```

- **Then:** Eligible for cache. **Edge TTL:** use cache-control header from origin.
  **Browser TTL:** respect origin.

Check after a minute: `curl -sI https://platform.whtzup.city/ | grep -i cf-cache-status`
should show `HIT` on the second request.

Listings change at most every couple of minutes (origin `s-maxage=120`), so no
purge hook is needed. If an urgent takedown must disappear immediately, purge the
URL in Cloudflare → Caching → Configuration → Custom Purge.

## 2. Only accept traffic from Cloudflare

On 2026-10-23 the VPS answered directly on ports 3000 (Next.js) and 6001 (launch
page), and nginx on 443 accepted any caller. A request with a made-up
`X-Forwarded-For` or `cf-connecting-ip` header got a fresh rate-limit bucket every
time, so the per-IP limits on login, sign-up and password reset could be skipped.

The deploy now binds saas-web and the launch page to `127.0.0.1`
(`ecosystem.config.js`). The rest is on the server.

**a. Firewall.** Only SSH and Cloudflare may reach the box:

```bash
ufw default deny incoming
ufw allow OpenSSH
for ip in $(curl -s https://www.cloudflare.com/ips-v4) $(curl -s https://www.cloudflare.com/ips-v6); do
  ufw allow proto tcp from "$ip" to any port 80,443
done
ufw enable
ufw status numbered   # 3000, 4001, 4002 and 6001 must not be listed
```

**b. nginx: real client IP from Cloudflare only.** `/etc/nginx/conf.d/cloudflare-real-ip.conf`
(list: https://www.cloudflare.com/ips/):

```nginx
# Trust CF-Connecting-IP only when the TCP peer is a Cloudflare edge.
real_ip_header CF-Connecting-IP;
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;
```

In every `location` that proxies to the app (`platform.whtzup.city`), overwrite the
forwarding headers so nothing a client sends survives. Use `127.0.0.1`, not
`localhost`, which may resolve to `::1` where nothing listens now:

```nginx
proxy_pass http://127.0.0.1:3000;
proxy_set_header X-Real-IP $remote_addr;          # the real visitor, set by real_ip
proxy_set_header X-Forwarded-For $remote_addr;    # replace, don't append
proxy_set_header CF-Connecting-IP $remote_addr;
proxy_set_header X-Forwarded-Proto https;
```

Do the same for the launch page (`proxy_pass http://127.0.0.1:6001;`).

**c. Tell the API which header to trust.** Add to the repo-root `.env` on the VPS,
then run `bash scripts/deploy.sh` (or `pm2 restart saas-api --update-env`):

```
TRUSTED_IP_HEADER=x-real-ip
```

Only do this after (b). Before it, `X-Real-IP` is the Cloudflare edge address and
many visitors would share one rate-limit bucket.

**d. Check.**

```bash
nginx -t && systemctl reload nginx
curl -sI https://platform.whtzup.city/ | head -1   # 200 through Cloudflare
```

From another machine, `curl --max-time 5 http://<VPS-IP>:3000/` and
`curl --resolve platform.whtzup.city:443:<VPS-IP> https://platform.whtzup.city/`
must both fail. Six wrong logins in a row from one browser must still be refused.

## 3. Deploys

`scripts/deploy.sh` archives the old `.next/static` before building and merges it
back (without overwriting) after, keeping files for two days, so tabs opened before
a deploy keep working. It then runs `pm2 startOrReload ecosystem.config.js`, which
applies the env in that file and reloads the two saas-web cluster workers one at a
time (no downtime). The first deploy after 23 October deletes the old single
saas-web process once, because PM2 can't switch fork → cluster in place. Always
deploy with `bash scripts/deploy.sh`.

## 4. Cache public API reads at Cloudflare, WAF

Public, user-independent API reads now send
`Cache-Control: public, s-maxage=60, stale-while-revalidate=300` (categories,
trending, platform offers, events, announcements, plan catalogue). Add a second
cache rule, **Public API reads**:

```
(http.host eq "platform.whtzup.city")
and http.request.method eq "GET"
and (
  starts_with(http.request.uri.path, "/api/v1/categories")
  or starts_with(http.request.uri.path, "/api/v1/trending/")
  or http.request.uri.path eq "/api/v1/platform-offers/public"
  or starts_with(http.request.uri.path, "/api/v1/events")
  or starts_with(http.request.uri.path, "/api/v1/announcements")
  or http.request.uri.path eq "/api/v1/subscriptions/catalogue"
)
```

**Then:** Eligible for cache, Edge TTL: use origin header. Cloudflare never caches
responses with `Set-Cookie`, and these routes never set one.

Under **Security → WAF**, turn on the Cloudflare Managed Ruleset and add a
rate-limiting rule for paths starting `/api/v1/auth/` (for example 20 requests per
minute per IP, block for 10 minutes), so floods stop at the edge.

## 5. Secrets and settings for this batch (VPS `.env`)

| Variable | What to set |
| --- | --- |
| `MAIL_PROVIDER=resend`, `RESEND_API_KEY`, `MAIL_FROM` | Without them no email is sent, password reset included. Verify the whtzup.city domain in Resend. |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare → Turnstile → add `platform.whtzup.city`, mode *Invisible*. The site key is baked into the web build, so redeploy after setting it. |
| `SENTRY_DSN` | sentry.io → new Node.js project. API errors and browser errors both arrive there. |
| `SECURITY_ALERT_WEBHOOK_URL` | Slack, Discord or Google Chat incoming webhook: admin role grants, admin lockouts, 2FA turned off, login and 5xx spikes. |
| `ADMIN_2FA_REQUIRED` | Keep `false` until every admin and staff account has set up two-factor at `/account/security`, then set `true`. |
| `AUDIT_RETENTION_DAYS`, `ANALYTICS_RETENTION_DAYS` | Optional. Refresh tokens and sessions are purged 30 days after expiry regardless. |
| `TRUSTED_IP_HEADER` | `x-real-ip`, only after section 2b. |
| `BACKUP_PASSPHRASE` | For section 6. Keep a copy outside the VPS (password manager). |

Uptime: add a free monitor (UptimeRobot, Better Stack or Cloudflare Health Checks)
for `https://platform.whtzup.city/` and `https://platform.whtzup.city/api/v1/health`.

Supabase (still open from 22 October): Authentication → Providers → Email → turn
off **Allow new users to sign up**, then run `scripts/sql/storage-lockdown.sql`.

## 6. Backups and a restore test

Supabase's own backups depend on the plan (daily on Pro; point-in-time recovery is
an add-on). `scripts/backup-db.sh` adds an independent, encrypted copy:

```bash
apt-get install -y postgresql-client-17 gnupg awscli   # pg_dump must be >= the server version
crontab -e
# 02:30 IST every night
30 21 * * * cd /root/saas-listing-platform && bash scripts/backup-db.sh >> /var/log/whtzup-backup.log 2>&1
```

Restore test, into a scratch database and never production; once now, then quarterly:

```bash
gpg --decrypt /var/backups/whtzup/whtzup-<stamp>.dump.gpg > /tmp/restore.dump
createdb restore_test        # or a separate Supabase project
pg_restore --no-owner --dbname=restore_test /tmp/restore.dump
psql restore_test -c 'select count(*) from users;' -c 'select count(*) from businesses;'
rm /tmp/restore.dump
```

## 7. Database access

- **Separate development database.** Local `.env` files point at production today.
  Create a second Supabase project for development and staging, run the migrations
  against it, seed it, and point local `.env` files there. Then rotate the
  production database password and service-role key (Supabase → Settings), update
  only the VPS `.env`, and redeploy.
- **Least-privilege runtime role.** `scripts/sql/app-runtime-role.sql` creates
  `whtzup_app` (no DDL, no BYPASSRLS, no auth or storage schemas). The API and
  worker use it through `DATABASE_URL`; migrations keep `postgres` through
  `DIRECT_URL`. Review, run once, then switch `DATABASE_URL`.
- **Pooler.** Use the transaction pooler (port 6543) with
  `?pgbouncer=true&connection_limit=5` for `DATABASE_URL`, and the session or
  direct URL (port 5432) only for `DIRECT_URL`. Give other projects (Kitchen
  Platform) their own Supabase project instead of sharing this pool; the pooler's
  auth lookups (`pgbouncer.get_auth`, 541k calls) were the busiest statement.
