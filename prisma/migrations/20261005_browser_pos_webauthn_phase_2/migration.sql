-- CreateEnum
CREATE TYPE "DeviceAuthBindingMode" AS ENUM ('UNPAIRED', 'HMAC_LEGACY', 'WEBAUTHN');

-- CreateEnum
CREATE TYPE "DeviceWebAuthnCredentialStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "DeviceEnrollmentPurpose" AS ENUM ('PAIRING', 'REPAIR');

-- CreateEnum
CREATE TYPE "CashierLoginAttemptPurpose" AS ENUM ('CASHIER_LOGIN');

-- CreateEnum
CREATE TYPE "DeviceAttestationTrustResult" AS ENUM ('NOT_EVALUATED', 'TRUSTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "authBindingMode" "DeviceAuthBindingMode" NOT NULL DEFAULT 'UNPAIRED',
ADD COLUMN     "pairedAt" TIMESTAMP(3),
ALTER COLUMN "fingerprintHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "deviceCredentialId" TEXT;

-- CreateTable
CREATE TABLE "DeviceWebAuthnCredential" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "aaguid" TEXT NOT NULL,
    "signCount" INTEGER NOT NULL DEFAULT 0,
    "authenticatorAttachment" TEXT,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "backupEligible" BOOLEAN NOT NULL DEFAULT false,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "attestationFormat" TEXT,
    "attestationTrustResult" "DeviceAttestationTrustResult" NOT NULL DEFAULT 'NOT_EVALUATED',
    "rpId" TEXT NOT NULL,
    "status" "DeviceWebAuthnCredentialStatus" NOT NULL DEFAULT 'PENDING',
    "pairedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceWebAuthnCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceEnrollmentChallenge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "authorizationTokenHash" TEXT NOT NULL,
    "challengeHash" TEXT NOT NULL,
    "purpose" "DeviceEnrollmentPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceEnrollmentChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashierLoginAttempt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "bearerTokenHash" TEXT NOT NULL,
    "assertionChallengeHash" TEXT NOT NULL,
    "purpose" "CashierLoginAttemptPurpose" NOT NULL DEFAULT 'CASHIER_LOGIN',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashierLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceWebAuthnCredential_credentialId_key" ON "DeviceWebAuthnCredential"("credentialId");

-- CreateIndex
CREATE INDEX "DeviceWebAuthnCredential_tenantId_deviceId_status_idx" ON "DeviceWebAuthnCredential"("tenantId", "deviceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceWebAuthnCredential_tenantId_deviceId_id_key" ON "DeviceWebAuthnCredential"("tenantId", "deviceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceWebAuthnCredential_deviceId_id_key" ON "DeviceWebAuthnCredential"("deviceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceEnrollmentChallenge_authorizationTokenHash_key" ON "DeviceEnrollmentChallenge"("authorizationTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceEnrollmentChallenge_challengeHash_key" ON "DeviceEnrollmentChallenge"("challengeHash");

-- CreateIndex
CREATE INDEX "DeviceEnrollmentChallenge_tenantId_deviceId_expiresAt_idx" ON "DeviceEnrollmentChallenge"("tenantId", "deviceId", "expiresAt");

-- CreateIndex
CREATE INDEX "DeviceEnrollmentChallenge_tenantId_actorUserId_idx" ON "DeviceEnrollmentChallenge"("tenantId", "actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CashierLoginAttempt_bearerTokenHash_key" ON "CashierLoginAttempt"("bearerTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "CashierLoginAttempt_assertionChallengeHash_key" ON "CashierLoginAttempt"("assertionChallengeHash");

-- CreateIndex
CREATE INDEX "CashierLoginAttempt_tenantId_userId_expiresAt_idx" ON "CashierLoginAttempt"("tenantId", "userId", "expiresAt");

-- CreateIndex
CREATE INDEX "CashierLoginAttempt_tenantId_deviceId_expiresAt_idx" ON "CashierLoginAttempt"("tenantId", "deviceId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_branchId_id_key" ON "User"("tenantId", "branchId", "id");

-- CreateIndex
CREATE INDEX "Session_deviceCredentialId_idx" ON "Session"("deviceCredentialId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_deviceId_deviceCredentialId_fkey" FOREIGN KEY ("deviceId", "deviceCredentialId") REFERENCES "DeviceWebAuthnCredential"("deviceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceWebAuthnCredential" ADD CONSTRAINT "DeviceWebAuthnCredential_tenantId_deviceId_fkey" FOREIGN KEY ("tenantId", "deviceId") REFERENCES "Device"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceEnrollmentChallenge" ADD CONSTRAINT "DeviceEnrollmentChallenge_tenantId_branchId_deviceId_fkey" FOREIGN KEY ("tenantId", "branchId", "deviceId") REFERENCES "Device"("tenantId", "branchId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceEnrollmentChallenge" ADD CONSTRAINT "DeviceEnrollmentChallenge_tenantId_actorUserId_fkey" FOREIGN KEY ("tenantId", "actorUserId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashierLoginAttempt" ADD CONSTRAINT "CashierLoginAttempt_tenantId_branchId_userId_fkey" FOREIGN KEY ("tenantId", "branchId", "userId") REFERENCES "User"("tenantId", "branchId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashierLoginAttempt" ADD CONSTRAINT "CashierLoginAttempt_tenantId_branchId_deviceId_fkey" FOREIGN KEY ("tenantId", "branchId", "deviceId") REFERENCES "Device"("tenantId", "branchId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
