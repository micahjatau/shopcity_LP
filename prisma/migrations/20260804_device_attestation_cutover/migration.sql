-- Expand device attestation metadata for dedicated secret cutover.
ALTER TABLE "Device"
  ADD COLUMN "attestationSecretVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "attestationSecretRotatedAt" TIMESTAMP(3);
