-- CreateTable
CREATE TABLE "DeviceAttestation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DeviceAttestation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceAttestation_expiresAt_idx" ON "DeviceAttestation"("expiresAt");

-- CreateIndex
CREATE INDEX "DeviceAttestation_tenantId_deviceId_idx" ON "DeviceAttestation"("tenantId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceAttestation_tenantId_deviceId_nonce_key" ON "DeviceAttestation"("tenantId", "deviceId", "nonce");

-- AddForeignKey
ALTER TABLE "DeviceAttestation" ADD CONSTRAINT "DeviceAttestation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAttestation" ADD CONSTRAINT "DeviceAttestation_tenantId_deviceId_fkey" FOREIGN KEY ("tenantId", "deviceId") REFERENCES "Device"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
