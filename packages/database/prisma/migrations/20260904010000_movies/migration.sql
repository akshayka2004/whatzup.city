-- Movie listings — platform-managed, no business ownership

CREATE TABLE "movies" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "poster_image" TEXT,
    "language" VARCHAR(50),
    "genres" JSONB NOT NULL DEFAULT '[]',
    "duration_minutes" INTEGER,
    "certification" VARCHAR(10),
    "release_date" TIMESTAMP(3),
    "synopsis" TEXT,
    "cast" JSONB NOT NULL DEFAULT '[]',
    "trailer_url" TEXT,
    "booking_url" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'UPCOMING',
    "target_cities" JSONB NOT NULL DEFAULT '[]',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "movies_tenant_id_idx" ON "movies"("tenant_id");
CREATE INDEX "movies_status_idx" ON "movies"("status");
CREATE INDEX "movies_deleted_at_idx" ON "movies"("deleted_at");

ALTER TABLE "movies" ADD CONSTRAINT "movies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
