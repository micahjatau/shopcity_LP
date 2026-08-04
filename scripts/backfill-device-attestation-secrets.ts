import { PrismaClient } from '@prisma/client';
import {
  encryptDeviceAttestationSecret,
  generateDeviceAttestationSecret,
} from '../src/common/auth/device-attestation-secret';

const prisma = new PrismaClient();
const batchSize = Number(process.env.BACKFILL_BATCH_SIZE ?? 50);

async function main() {
  const kek = process.env.DEVICE_ATTESTATION_KEK;
  if (!kek) {
    throw new Error('DEVICE_ATTESTATION_KEK is required');
  }

  let migrated = 0;
  let revokedSessions = 0;
  const migratedDeviceIds: string[] = [];

  while (true) {
    const devices = await prisma.device.findMany({
      where: { attestationSecretCiphertext: null },
      orderBy: { id: 'asc' },
      take: batchSize,
      select: { id: true, tenantId: true },
    });

    if (devices.length === 0) {
      break;
    }

    for (const device of devices) {
      const attestationSecret = generateDeviceAttestationSecret();
      await prisma.$transaction(async (tx) => {
        const updated = await tx.device.update({
          where: { id: device.id },
          data: {
            attestationSecretCiphertext: encryptDeviceAttestationSecret(
              attestationSecret,
              kek,
            ),
            attestationSecretVersion: { increment: 1 },
            attestationSecretRotatedAt: new Date(),
          },
        });

        const sessions = await tx.session.updateMany({
          where: { deviceId: device.id, status: 'ACTIVE' },
          data: { status: 'REVOKED', revokedAt: new Date() },
        });

        if (sessions.count > 0) {
          revokedSessions += sessions.count;
        }

        await tx.auditLog.create({
          data: {
            tenantId: device.tenantId,
            actorId: null,
            actorTenantId: null,
            action: 'device.attestation-secret.backfill',
            entityType: 'device',
            entityId: updated.id,
            metadata: {
              attestationSecretVersion: updated.attestationSecretVersion,
              revokedSessionCount: sessions.count,
            },
          },
        });
      });

      migrated += 1;
      migratedDeviceIds.push(device.id);
    }
  }

  console.log(
    JSON.stringify(
      {
        migrated,
        revokedSessions,
        migratedDeviceIds,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
