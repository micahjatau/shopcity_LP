ALTER TYPE "DeviceAuthBindingMode" ADD VALUE 'DEVICE_TOKEN';

CREATE TYPE "DeviceTokenCredentialStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "DeviceTokenCredential" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "status" "DeviceTokenCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "pairedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceTokenCredential_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DeviceTokenCredential_keyVersion_check" CHECK ("keyVersion" > 0)
);

CREATE UNIQUE INDEX "DeviceTokenCredential_tokenHash_key" ON "DeviceTokenCredential"("tokenHash");
CREATE UNIQUE INDEX "DeviceTokenCredential_tenantId_deviceId_id_key" ON "DeviceTokenCredential"("tenantId", "deviceId", "id");
CREATE UNIQUE INDEX "DeviceTokenCredential_one_active_per_device_key" ON "DeviceTokenCredential"("deviceId") WHERE "status" = 'ACTIVE';
CREATE INDEX "DeviceTokenCredential_tenantId_deviceId_status_idx" ON "DeviceTokenCredential"("tenantId", "deviceId", "status");

ALTER TABLE "DeviceTokenCredential"
    ADD CONSTRAINT "DeviceTokenCredential_tenantId_deviceId_fkey"
    FOREIGN KEY ("tenantId", "deviceId") REFERENCES "Device"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE;
