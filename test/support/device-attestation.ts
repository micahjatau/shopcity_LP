import type { Prisma } from '@prisma/client';
import { encryptDeviceAttestationSecret } from '../../src/common/auth/device-attestation-secret';

export function createAttestedDeviceData(
  data: Prisma.DeviceUncheckedCreateInput,
): Prisma.DeviceUncheckedCreateInput {
  const attestationSecret = data.fingerprintHash;

  if (!attestationSecret) {
    throw new Error('Missing fingerprint hash for attested device');
  }

  return {
    ...data,
    attestationSecretCiphertext: encryptDeviceAttestationSecret(
      attestationSecret,
      process.env.DEVICE_ATTESTATION_KEK ?? 'test-device-attestation-kek',
    ),
    attestationSecretVersion: 1,
    attestationSecretRotatedAt: new Date(),
  };
}
