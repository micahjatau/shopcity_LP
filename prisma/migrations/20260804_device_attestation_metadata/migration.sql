-- Expand device attestation replay evidence without rewriting historical rows.
ALTER TABLE "DeviceAttestation"
  ADD COLUMN "nonceHash" TEXT,
  ADD COLUMN "attestationTimestamp" TIMESTAMP(3),
  ADD COLUMN "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  ADD COLUMN "issuedSessionId" TEXT;

ALTER TABLE "Device"
  ADD COLUMN "attestationSecretCiphertext" TEXT;

CREATE UNIQUE INDEX "DeviceAttestation_tenantId_deviceId_nonceHash_key"
  ON "DeviceAttestation"("tenantId", "deviceId", "nonceHash");

CREATE INDEX "DeviceAttestation_issuedSessionId_idx"
  ON "DeviceAttestation"("issuedSessionId");
