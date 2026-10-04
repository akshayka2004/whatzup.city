-- PAN and GSTIN are stored as AES-256-GCM ciphertext (`v1:<iv>:<tag>:<data>`,
-- ~65+ chars), which never fits the old VARCHAR(15) / VARCHAR(20) columns and
-- made every payment submission fail with Prisma P2000 ("value too long").
ALTER TABLE "billing_profiles"
  ALTER COLUMN "gstin" TYPE TEXT,
  ALTER COLUMN "pan" TYPE TEXT;
