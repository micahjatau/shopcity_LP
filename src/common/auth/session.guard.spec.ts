import { SessionPurpose, UserRole, UserStatus } from '@prisma/client';
import {
  isSessionDeviceEligible,
  isSessionIdleExpired,
  loadAuthContext,
} from './session.guard';

describe('loadAuthContext WebAuthn session binding', () => {
  it('loads the direct credential relation and rejects a revoked credential', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'session-id',
      userId: 'user-id',
      deviceId: 'device-id',
      deviceCredentialId: 'credential-id',
      purpose: SessionPurpose.USER,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: null,
      user: {
        ...activeUser(),
        tenant: { status: 'ACTIVE' },
        branch: { status: 'ACTIVE' },
      },
      device: {
        tenantId: 'tenant-id',
        branchId: 'branch-id',
        status: 'ACTIVE',
        authBindingMode: 'WEBAUTHN',
        branch: { status: 'ACTIVE' },
      },
      deviceCredential: {
        id: 'credential-id',
        tenantId: 'tenant-id',
        deviceId: 'device-id',
        status: 'REVOKED',
        authenticatorAttachment: 'platform',
        backupEligible: false,
        backedUp: false,
        attestationTrustResult: 'TRUSTED',
        rpId: 'pos.example.test',
      },
    });
    const request = { headers: { authorization: 'Bearer session-token' } };
    const config = {
      get: (key: string) =>
        key === 'SESSION_SECRET' ? 'secret' : 'pos.example.test',
    };

    await expect(
      loadAuthContext(
        request as never,
        { session: { findUnique } } as never,
        config as never,
      ),
    ).resolves.toBeNull();
    const findCalls = findUnique.mock.calls as unknown as Array<
      [{ include: { deviceCredential: { select: Record<string, boolean> } } }]
    >;
    expect(findCalls[0][0].include.deviceCredential.select.id).toBe(true);
    expect(findCalls[0][0].include.deviceCredential.select.status).toBe(true);
  });
});

describe('isSessionIdleExpired', () => {
  const config = {
    get: jest.fn(
      (key: string) =>
        ({
          SESSION_IDLE_CASHIER_MINUTES: 30,
          SESSION_IDLE_SUPERVISOR_MINUTES: 15,
          SESSION_IDLE_ADMIN_MINUTES: 15,
        })[key],
    ),
  };
  const now = new Date('2026-08-24T12:00:00.000Z');

  it('expires an idle cashier after the cashier window', () => {
    expect(
      isSessionIdleExpired(
        { lastUsedAt: new Date('2026-08-24T11:29:59.000Z') },
        { role: UserRole.CASHIER },
        config,
        now,
      ),
    ).toBe(true);
  });

  it('uses the shorter supervisor window', () => {
    expect(
      isSessionIdleExpired(
        { lastUsedAt: new Date('2026-08-24T11:44:59.000Z') },
        { role: UserRole.SUPERVISOR },
        config,
        now,
      ),
    ).toBe(true);
  });

  it('keeps a recently used session active', () => {
    expect(
      isSessionIdleExpired(
        { lastUsedAt: new Date('2026-08-24T11:45:01.000Z') },
        { role: UserRole.SUPERVISOR },
        config,
        now,
      ),
    ).toBe(false);
  });
});

describe('isSessionDeviceEligible', () => {
  it('rejects a linked device on an inactive branch', () => {
    expect(
      isSessionDeviceEligible({
        deviceId: 'device-id',
        purpose: SessionPurpose.USER,
        user: activeUser(),
        device: {
          tenantId: 'tenant-id',
          status: 'ACTIVE',
          branchId: 'branch-id',
          branch: { status: 'INACTIVE' },
        },
      }),
    ).toBe(false);
  });

  it('rejects a linked device moved away from the user branch', () => {
    expect(
      isSessionDeviceEligible({
        deviceId: 'device-id',
        purpose: SessionPurpose.USER,
        user: activeUser(),
        device: {
          tenantId: 'tenant-id',
          status: 'ACTIVE',
          branchId: 'other-branch-id',
          branch: { status: 'ACTIVE' },
        },
      }),
    ).toBe(false);
  });

  it('rejects a linked device from another tenant', () => {
    expect(
      isSessionDeviceEligible({
        deviceId: 'device-id',
        purpose: SessionPurpose.USER,
        user: activeUser(),
        device: {
          tenantId: 'other-tenant-id',
          status: 'ACTIVE',
          branchId: 'branch-id',
          branch: { status: 'ACTIVE' },
        },
      }),
    ).toBe(false);
  });

  it('rejects device-less CASHIER USER sessions and unpaired cashier devices', () => {
    expect(
      isSessionDeviceEligible({
        deviceId: null,
        deviceCredentialId: null,
        purpose: SessionPurpose.USER,
        user: activeUser(),
      }),
    ).toBe(false);

    const unpaired = webauthnSession();
    unpaired.device.authBindingMode = 'UNPAIRED';
    unpaired.deviceCredentialId = null;
    unpaired.deviceCredential = null;
    expect(isSessionDeviceEligible(unpaired, 'pos.example.test')).toBe(false);

    unpaired.device.authBindingMode = 'UNRECOGNIZED';
    expect(isSessionDeviceEligible(unpaired, 'pos.example.test')).toBe(false);
  });

  it('accepts a CASHIER USER HMAC_LEGACY session only without credential binding', () => {
    const legacy = webauthnSession();
    legacy.device.authBindingMode = 'HMAC_LEGACY';
    legacy.deviceCredentialId = null;
    legacy.deviceCredential = null;
    expect(isSessionDeviceEligible(legacy, 'pos.example.test')).toBe(true);
  });

  it('requires a device for cashier smoke sessions but preserves non-cashier device-less smoke sessions', () => {
    const cashierSmoke = webauthnSession();
    cashierSmoke.purpose = SessionPurpose.SMOKE;
    cashierSmoke.device.authBindingMode = 'HMAC_LEGACY';
    cashierSmoke.deviceCredentialId = null;
    cashierSmoke.deviceCredential = null;
    expect(isSessionDeviceEligible(cashierSmoke)).toBe(true);

    const webauthnSmoke = webauthnSession();
    webauthnSmoke.purpose = SessionPurpose.SMOKE;
    webauthnSmoke.deviceCredentialId = null;
    webauthnSmoke.deviceCredential = null;
    expect(isSessionDeviceEligible(webauthnSmoke, 'pos.example.test')).toBe(
      false,
    );

    expect(
      isSessionDeviceEligible({
        deviceId: null,
        deviceCredentialId: null,
        purpose: SessionPurpose.SMOKE,
        user: activeUser(),
      }),
    ).toBe(false);
    expect(
      isSessionDeviceEligible({
        deviceId: null,
        deviceCredentialId: null,
        purpose: SessionPurpose.SMOKE,
        user: { ...activeUser(), role: UserRole.ADMIN },
      }),
    ).toBe(true);
  });

  it('accepts only the exact active trusted platform credential for a WebAuthn cashier device session', () => {
    expect(isSessionDeviceEligible(webauthnSession(), 'pos.example.test')).toBe(
      true,
    );
  });

  it.each([
    ['missing credential id', { deviceCredentialId: null }],
    ['missing relation', { deviceCredential: null }],
    ['revoked credential', { deviceCredential: { status: 'REVOKED' } }],
    ['mismatched credential id', { deviceCredential: { id: 'other-id' } }],
    [
      'wrong credential tenant',
      { deviceCredential: { tenantId: 'other-tenant' } },
    ],
    [
      'wrong credential device',
      { deviceCredential: { deviceId: 'other-device' } },
    ],
    [
      'untrusted credential',
      { deviceCredential: { attestationTrustResult: 'NOT_EVALUATED' } },
    ],
    [
      'cross-platform credential',
      { deviceCredential: { authenticatorAttachment: 'cross-platform' } },
    ],
    [
      'backup eligible credential',
      { deviceCredential: { backupEligible: true } },
    ],
    ['backed-up credential', { deviceCredential: { backedUp: true } }],
    ['RP mismatch', { deviceCredential: { rpId: 'other.example.test' } }],
  ])('rejects a WebAuthn session with %s', (_name, overrides) => {
    expect(
      isSessionDeviceEligible(webauthnSession(overrides), 'pos.example.test'),
    ).toBe(false);
  });

  it('rejects WebAuthn device sessions for non-cashiers', () => {
    const session = webauthnSession();
    session.user.role = UserRole.ADMIN;
    expect(isSessionDeviceEligible(session, 'pos.example.test')).toBe(false);
  });

  it('rejects credential IDs on non-WebAuthn modes and without a device', () => {
    const legacy = webauthnSession();
    legacy.device.authBindingMode = 'HMAC_LEGACY';
    expect(isSessionDeviceEligible(legacy, 'pos.example.test')).toBe(false);

    expect(
      isSessionDeviceEligible({
        deviceId: null,
        deviceCredentialId: 'credential-id',
        purpose: SessionPurpose.USER,
        user: activeUser(),
      }),
    ).toBe(false);
  });

  it('allows existing HMAC and device-less smoke sessions without credential binding', () => {
    const legacy = webauthnSession();
    legacy.device.authBindingMode = 'HMAC_LEGACY';
    legacy.deviceCredentialId = null;
    legacy.deviceCredential = null;
    legacy.purpose = SessionPurpose.SMOKE;
    expect(isSessionDeviceEligible(legacy)).toBe(true);
    expect(
      isSessionDeviceEligible({
        deviceId: null,
        deviceCredentialId: null,
        purpose: SessionPurpose.SMOKE,
        user: { ...activeUser(), role: UserRole.ADMIN },
      }),
    ).toBe(true);
  });
});

function webauthnSession(
  overrides: {
    deviceId?: string | null;
    deviceCredentialId?: string | null;
    user?: Record<string, unknown>;
    device?: Record<string, unknown>;
    deviceCredential?: Record<string, unknown> | null;
  } = {},
) {
  const credential = {
    id: 'credential-id',
    tenantId: 'tenant-id',
    deviceId: 'device-id',
    status: 'ACTIVE',
    authenticatorAttachment: 'platform',
    backupEligible: false,
    backedUp: false,
    attestationTrustResult: 'TRUSTED',
    rpId: 'pos.example.test',
  };
  return {
    deviceId: 'device-id',
    deviceCredentialId: 'credential-id',
    purpose: SessionPurpose.USER,
    user: { ...activeUser(), ...overrides.user },
    device: {
      tenantId: 'tenant-id',
      status: 'ACTIVE',
      branchId: 'branch-id',
      authBindingMode: 'WEBAUTHN',
      branch: { status: 'ACTIVE' },
      ...overrides.device,
    },
    deviceCredential:
      overrides.deviceCredential === undefined
        ? credential
        : { ...credential, ...overrides.deviceCredential },
    ...overrides,
  };
}

function activeUser() {
  return {
    id: 'user-id',
    tenantId: 'tenant-id',
    branchId: 'branch-id',
    username: 'cashier@shopcity.local',
    supabaseAuthId: 'supabase-id',
    role: UserRole.CASHIER,
    status: UserStatus.ACTIVE,
    lastLoginAt: null,
    createdAt: new Date('2026-08-03T00:00:00.000Z'),
    updatedAt: new Date('2026-08-03T00:00:00.000Z'),
  };
}
