ALTER TABLE "Device"
ADD CONSTRAINT "Device_active_attestation_secret_check"
CHECK (
  "status" <> 'ACTIVE'
  OR (
    "attestationSecretCiphertext" IS NOT NULL
    AND "attestationSecretVersion" > 0
    AND "attestationSecretRotatedAt" IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS "ReceiptQuarantineClaim" (
  "receiptId" TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "releasedAt" TIMESTAMP(3)
);
