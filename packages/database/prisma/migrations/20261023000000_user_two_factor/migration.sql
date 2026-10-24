-- Admin two-factor authentication (TOTP). Additive; existing rows get NULL / empty.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_secret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_recovery_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
