import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const DEVICE_ATTESTATION_SECRET_ALGORITHM = 'aes-256-gcm';
const DEVICE_ATTESTATION_SECRET_PREFIX = 'v1';

export function generateDeviceAttestationSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function encryptDeviceAttestationSecret(
  secret: string,
  keyMaterial: string,
): string {
  const { key, iv } = deriveSecretCipherMaterial(keyMaterial);
  const cipher = createCipheriv(DEVICE_ATTESTATION_SECRET_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    DEVICE_ATTESTATION_SECRET_PREFIX,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

export function decryptDeviceAttestationSecret(
  ciphertext: string,
  keyMaterial: string,
): string {
  const [prefix, ivRaw, authTagRaw, dataRaw] = ciphertext.split(':');

  if (
    prefix !== DEVICE_ATTESTATION_SECRET_PREFIX ||
    !ivRaw ||
    !authTagRaw ||
    !dataRaw
  ) {
    throw new Error('Device attestation secret is invalid');
  }

  const { key, iv } = deriveSecretCipherMaterial(keyMaterial, ivRaw);
  const decipher = createDecipheriv(
    DEVICE_ATTESTATION_SECRET_ALGORITHM,
    key,
    iv,
  );
  decipher.setAuthTag(Buffer.from(authTagRaw, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function deriveSecretCipherMaterial(keyMaterial: string, ivRaw?: string) {
  const key = createHash('sha256').update(keyMaterial).digest();
  const iv = ivRaw ? Buffer.from(ivRaw, 'base64url') : randomBytes(12);

  if (key.length !== 32) {
    throw new Error('Device attestation secret key is invalid');
  }

  return { key, iv };
}
