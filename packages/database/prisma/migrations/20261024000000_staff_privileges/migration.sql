-- Staff privileges. Additive: both columns are optional / defaulted, existing rows are unchanged.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "grants" JSONB;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;
