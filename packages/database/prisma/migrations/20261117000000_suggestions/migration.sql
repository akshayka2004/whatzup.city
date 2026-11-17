-- Suggestion box. New table only: nothing existing changes.

CREATE TABLE IF NOT EXISTS "suggestions" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "topic" VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
  "message" TEXT NOT NULL,
  "page" VARCHAR(200),
  "status" VARCHAR(12) NOT NULL DEFAULT 'NEW',
  "admin_note" VARCHAR(1000),
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "suggestions_status_created_at_idx" ON "suggestions" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "suggestions_user_id_created_at_idx" ON "suggestions" ("user_id", "created_at");
