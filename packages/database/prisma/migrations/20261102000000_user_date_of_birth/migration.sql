-- Additive: customers give their date of birth at sign-up and confirm they are 13 or older.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "date_of_birth" DATE,
  ADD COLUMN IF NOT EXISTS "age_confirmed_at" TIMESTAMP(3);
