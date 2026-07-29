# Security

How this platform is defended, what is deliberately not done yet, and what an
operator must do. Kept honest — an inaccurate security document is worse than
none, because it produces false confidence.

## Sensitive data we hold

| Data | Where | Protection |
|---|---|---|
| Passwords | `users.password_hash` | argon2id, never logged |
| PAN, GSTIN | `billing_profiles`, `businesses.compliance` | AES-256-GCM at rest, masked in admin UI |
| Billing address, invoice email | `billing_profiles` | Access restricted to owner + admins |
| Payment screenshots | `verification-documents` bucket (private) | Signed URLs, 15 min expiry |
| Financial ledger | `transactions` | Append-only, admin-only reads |
| Refresh tokens | `refresh_tokens` | Persisted, revocable |

## Controls in place

**Authentication**
- argon2id password hashing.
- Access tokens 15 min; refresh tokens persisted and revocable.
- Redis brute-force counters: 10 attempts/15 min per IP, 5/10 min per account.
- Durable DB lockout as a second layer (survives a Redis restart or flush):
  5 consecutive failures → 15 min, doubling per further block, capped at 24 h.
- Login returns an identical error whether the account exists or the password is
  wrong, so it cannot be used to enumerate registered emails.
- Per-route throttles: login 5/15 min, forgot-password 3/15 min,
  reset-password 5/15 min, signup 5/hour.

**Authorisation**
- JWT guard + role guard; admin endpoints restricted to `MASTER_ADMIN` /
  `SUPER_ADMIN`.
- Ownership checked in-service on business-scoped writes.

**Data protection**
- PAN/GSTIN encrypted with AES-256-GCM (authenticated — tampering is detected).
  Key from `ENCRYPTION_KEY`, which must live outside the database.
- Admin list views mask PAN/GSTIN. Unmasking goes through
  `GET /v1/payments/admin/businesses/:id/billing-profile?reveal=true`, which
  writes a `BILLING_PII_REVEALED` audit row.
- Audit metadata is passed through a redactor that strips passwords, tokens,
  PAN/GSTIN, card and bank fields before persisting.

**Input & transport**
- `ValidationPipe({ whitelist: true })` — undeclared properties are stripped.
- Prisma everywhere: queries are parameterised, so SQL injection is not a vector.
- helmet: CSP, HSTS (1 year, preload), `frame-ancestors 'none'`, `noSniff`,
  `Referrer-Policy`, plus a `Permissions-Policy` denying camera/mic/USB etc.
- CORS restricted to an explicit origin allowlist.

**Uploads**
- Browser uploads go straight to storage via a signed URL, so the declared MIME
  type is unverified at request time. Payment proofs are therefore re-checked
  server-side **after** upload against their real magic bytes; anything that is
  not a genuine JPG/PNG/WEBP/PDF is deleted from the bucket.
- SVG and HTML are rejected outright — they are images by MIME but can carry
  script.
- Filenames are sanitised against path traversal and control characters.

**Money**
- Prices are computed server-side; a client-sent amount is never trusted.
- Every payment event writes an append-only `Transaction` row.

## Known gaps — deliberate, not oversights

1. **No Row-Level Security.** The API connects as the table owner, which
   bypasses RLS unless `FORCE ROW LEVEL SECURITY` is set. Real RLS needs a
   restricted DB role, per-request session variables and policies per table.
   Chosen mitigation is defence-in-depth: `pnpm security:tenant-scope` flags
   reads on tenant-owned models with no tenant/owner filter.
   **Application code is currently the only barrier between tenants.**
2. **Tenant-scope findings are triaged — the scan is clean.** All 30 real
   findings were reviewed and annotated with `// tenant-scope-ok: <reason>`, so
   any *new* unscoped read now shows up immediately. The original 47 included 17
   false positives from ES6 shorthand (`{ businessId, ... }`), since fixed in the
   scanner. The reviewed queries fall into four groups: public discovery (search,
   trending, categories), platform-wide admin metrics, role-guarded admin queues
   that span tenants by design, and global uniqueness checks selecting only an id.
   No cross-tenant leak was found. Note this is a text-based heuristic, not a
   runtime guarantee — it cannot see dynamically-built `where` objects.
3. **No 2FA for admin accounts.** Admins can approve payments and reveal PAN
   for every business. TOTP with recovery codes is the intended fix; deferred by
   decision, not because it is unimportant.
4. **Encryption key sits on the application server.** Anyone with shell access
   to the VPS has both the key and database access. A managed KMS would separate
   those.
5. **Existing plaintext PAN/GSTIN rows are not backfilled.** `decrypt()` passes
   through unrecognised values, so old rows still read correctly but remain
   unencrypted until rewritten.

## Operator responsibilities

```bash
# Generate the encryption key (once). Store it in a password manager —
# losing it makes existing encrypted PAN/GSTIN unrecoverable.
openssl rand -hex 32
```

- Set `ENCRYPTION_KEY` and a strong `JWT_SECRET` (≥32 chars). The API refuses to
  start in production without both.
- Never commit `.env`. It is gitignored; the service-role key has never been
  committed (verified against full git history).
- Enable 2FA on GitHub, Supabase and the VPS host.
- Automated encrypted backups **plus periodic restore drills** — an untested
  backup is not a backup.
- Run `pnpm security:check` before each release.

## Reporting

Email security@lifeartgroup.in. Please do not open a public issue for a
vulnerability.
