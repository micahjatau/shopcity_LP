import {
  serializeCredential,
  toCredentialCreationOptions,
  toCredentialRequestOptions,
} from '../lib/webauthn-json';

describe('WebAuthn JSON conversion', () => {
  it('decodes base64url challenge and credential IDs for registration and assertion', () => {
    const registration = toCredentialCreationOptions({
      challenge: 'AQID',
      user: { id: 'BAUG', name: 'pos', displayName: 'POS' },
      rp: { id: 'localhost', name: 'ShopCity' },
      pubKeyCredParams: [],
      excludeCredentials: [{ id: 'BwgJ', type: 'public-key' }],
    });
    expect(Array.from(new Uint8Array(registration.challenge))).toEqual([
      1, 2, 3,
    ]);
    expect(Array.from(new Uint8Array(registration.user.id))).toEqual([4, 5, 6]);
    expect(
      Array.from(new Uint8Array(registration.excludeCredentials![0].id)),
    ).toEqual([7, 8, 9]);
    const assertion = toCredentialRequestOptions({
      challenge: 'AQID',
      allowCredentials: [{ id: 'BAUG', type: 'public-key' }],
    });
    expect(Array.from(new Uint8Array(assertion.challenge))).toEqual([1, 2, 3]);
    expect(
      Array.from(new Uint8Array(assertion.allowCredentials![0].id)),
    ).toEqual([4, 5, 6]);
  });

  it('serializes a public credential response as base64url JSON', () => {
    const credential = {
      id: 'cred',
      rawId: new Uint8Array([251, 255]).buffer,
      type: 'public-key',
      authenticatorAttachment: 'platform',
      response: {
        clientDataJSON: new Uint8Array([1]).buffer,
        authenticatorData: new Uint8Array([2]).buffer,
        signature: new Uint8Array([3]).buffer,
        userHandle: null,
      },
      getClientExtensionResults: () => ({}),
    } as unknown as PublicKeyCredential;
    expect(serializeCredential(credential)).toMatchObject({
      rawId: '-_8',
      authenticatorAttachment: 'platform',
      response: { clientDataJSON: 'AQ' },
    });
  });
});
