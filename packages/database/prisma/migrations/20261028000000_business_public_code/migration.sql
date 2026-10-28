-- Short permanent code for business QR codes (/b/CODE). Additive: the column is optional and
-- existing QR codes (/business/<id>) keep working.
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "public_code" VARCHAR(12);
CREATE UNIQUE INDEX IF NOT EXISTS "businesses_public_code_key" ON "businesses" ("public_code");

-- Give every existing business a code now so the first QR print needs no extra step.
-- Alphabet has no I, L, O, 0 or 1. A clash is retried with a new code.
DO $$
DECLARE
  r RECORD;
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  c TEXT;
  i INT;
BEGIN
  FOR r IN SELECT id FROM "businesses" WHERE "public_code" IS NULL LOOP
    LOOP
      c := '';
      FOR i IN 1..6 LOOP
        c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      BEGIN
        UPDATE "businesses" SET "public_code" = c WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- try another code
      END;
    END LOOP;
  END LOOP;
END $$;
