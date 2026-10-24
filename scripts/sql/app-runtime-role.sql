-- ============================================================
-- Least-privilege database role for the running API + worker
-- ============================================================
-- NOT run automatically. Review, then run once in the Supabase SQL editor
-- (as postgres). Migrations keep using the postgres user via DIRECT_URL; only
-- DATABASE_URL (runtime) switches to this role.
--
-- What it removes compared with running as postgres:
--   * no DDL (can't drop/alter tables), no CREATE ROLE / CREATE DATABASE
--   * no BYPASSRLS
--   * no access to Supabase's auth / storage / vault schemas
--
-- 1. Pick a long random password (openssl rand -base64 36) and put it below.
-- 2. Run this script.
-- 3. Set on the VPS (.env), then redeploy:
--      DATABASE_URL=postgresql://whtzup_app.<project-ref>:<password>@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5
--    (keep DIRECT_URL on postgres for `prisma migrate deploy`)
-- 4. After each migration that adds tables, the default privileges below cover
--    new tables automatically.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'whtzup_app') THEN
    CREATE ROLE whtzup_app LOGIN PASSWORD 'CHANGE_ME'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION;
  END IF;
END $$;

ALTER ROLE whtzup_app SET statement_timeout = '30s';
ALTER ROLE whtzup_app SET idle_in_transaction_session_timeout = '60s';

GRANT USAGE ON SCHEMA public TO whtzup_app;
-- Extension functions (uuid, trigram, crypto) live in the extensions schema on Supabase.
GRANT USAGE ON SCHEMA extensions TO whtzup_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO whtzup_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO whtzup_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO whtzup_app;

-- Tables created later by migrations (run as postgres) get the same grants.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO whtzup_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO whtzup_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO whtzup_app;

-- Prisma never reads these; keep the app role out of them explicitly.
REVOKE ALL ON SCHEMA auth FROM whtzup_app;
REVOKE ALL ON SCHEMA storage FROM whtzup_app;

-- Tables with row level security on would hide every row from a role without a
-- policy. The app does its own tenant checks, so give the app role a pass-through
-- policy on those tables only (anon/authenticated stay locked out).
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t.relname AND policyname = 'whtzup_app_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY whtzup_app_all ON public.%I TO whtzup_app USING (true) WITH CHECK (true)',
        t.relname
      );
    END IF;
  END LOOP;
END $$;

-- Check: should list SELECT/INSERT/UPDATE/DELETE on app tables only.
-- SELECT table_name, string_agg(privilege_type, ',') FROM information_schema.role_table_grants
--   WHERE grantee = 'whtzup_app' GROUP BY 1 ORDER BY 1;
