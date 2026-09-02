-- Expand device attestation metadata for dedicated secret cutover.
ALTER TABLE "Device"
  ADD COLUMN IF NOT EXISTS "attestationSecretVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "attestationSecretRotatedAt" TIMESTAMP(3);
