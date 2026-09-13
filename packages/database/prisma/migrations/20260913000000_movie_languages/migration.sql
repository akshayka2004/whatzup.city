-- `movies.language` was a VarChar(50) admin free-text field. Cramming more
-- than one language into it (e.g. "Malayalam, English, Hindi, Tamil, Telugu")
-- overflows the column and Postgres rejects the write with a raw DB error.
-- Replace it with a JSONB array (same pattern as `genres`/`cast`), which has
-- no per-value length limit, and supports multiple languages natively.

ALTER TABLE "movies" ADD COLUMN "languages" JSONB NOT NULL DEFAULT '[]';

-- Backfill: split any existing comma-separated value into a proper array.
UPDATE "movies"
SET "languages" = COALESCE(
  (
    SELECT jsonb_agg(trim(part))
    FROM unnest(string_to_array("language", ',')) AS part
    WHERE trim(part) <> ''
  ),
  '[]'::jsonb
)
WHERE "language" IS NOT NULL;

ALTER TABLE "movies" DROP COLUMN "language";
