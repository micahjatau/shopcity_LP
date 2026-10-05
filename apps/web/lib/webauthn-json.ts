type JsonRecord = Record<string, unknown>;

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(normalized + '='.repeat((4 - (normalized.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64Url(value: ArrayBuffer | ArrayBufferView): string {
  const bytes = value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function copyWithBytes(value: unknown, keys: string[]): JsonRecord {
  const result = { ...(value as JsonRecord) };
  for (const key of keys) {
    const encoded = result[key];
    if (typeof encoded === 'string') result[key] = base64UrlToBytes(encoded);
  }
  return result;
}

export function toCredentialCreationOptions(options: JsonRecord): PublicKeyCredentialCreationOptions {
  const publicKey = copyWithBytes(options, ['challenge', 'user']);
  const user = copyWithBytes(publicKey.user, ['id']);
  const excludeCredentials = Array.isArray(publicKey.excludeCredentials)
    ? publicKey.excludeCredentials.map((item) => copyWithBytes(item, ['id']))
    : undefined;
  return { ...publicKey, user, excludeCredentials } as unknown as PublicKeyCredentialCreationOptions;
}

export function toCredentialRequestOptions(options: JsonRecord): PublicKeyCredentialRequestOptions {
  const publicKey = copyWithBytes(options, ['challenge']);
  const allowCredentials = Array.isArray(publicKey.allowCredentials)
    ? publicKey.allowCredentials.map((item) => copyWithBytes(item, ['id']))
    : undefined;
  return { ...publicKey, allowCredentials } as unknown as PublicKeyCredentialRequestOptions;
}

export function serializeCredential(credential: PublicKeyCredential): JsonRecord {
  const response = credential.response;
  const serialized: JsonRecord = {
    id: credential.id,
    rawId: bytesToBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    response: {
      clientDataJSON: bytesToBase64Url(response.clientDataJSON),
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
  if ('attestationObject' in response) {
    const attestation = response as AuthenticatorAttestationResponse;
    serialized.response = {
      ...serialized.response as JsonRecord,
      attestationObject: bytesToBase64Url(attestation.attestationObject),
      transports: attestation.getTransports?.() ?? [],
    };
  } else if ('authenticatorData' in response && 'signature' in response) {
    const assertion = response as AuthenticatorAssertionResponse;
    serialized.response = {
      ...serialized.response as JsonRecord,
      authenticatorData: bytesToBase64Url(assertion.authenticatorData),
      signature: bytesToBase64Url(assertion.signature),
      userHandle: assertion.userHandle ? bytesToBase64Url(assertion.userHandle) : null,
    };
  }
  return serialized;
}
