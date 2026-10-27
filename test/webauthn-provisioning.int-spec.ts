import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import {
  DeviceAuthBindingMode,
  DeviceAttestationTrustResult,
  DeviceStatus,
  DeviceWebAuthnCredentialStatus,
  PrismaClient,
  SessionStatus,
  UserRole,
} from '@prisma/client';
import * as WebAuthnServer from '@simplewebauthn/server';

jest.mock('@simplewebauthn/server', () => ({
  ...jest.requireActual<typeof import('@simplewebauthn/server')>(
    '@simplewebauthn/server',
  ),
  verifyRegistrationResponse: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { seedFoundation } from '../prisma/seed';
import { encryptDeviceAttestationSecret } from '../src/common/auth/device-attestation-secret';
import { AuthService } from '../src/modules/auth/auth.service';
import { BranchesService } from '../src/modules/branches/branches.service';

describe('WebAuthn provisioning PostgreSQL integration', () => {
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = container.getConnectionUri();
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
  }, 120000);

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma?.$disconnect();
    await container?.stop();
  }, 120000);

  it('persists pairing, two-phase cashier login, and device deactivation revocation', async () => {
    const seed = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub(),
    });
    const cashier = await prisma.user.findUniqueOrThrow({
      where: { id: '00000000-0000-4000-8000-000000000004' },
    });
    expect(cashier.role).toBe(UserRole.CASHIER);

    const device = await prisma.device.create({
      data: {
        tenantId: seed.tenant.id,
        branchId: seed.branch.id,
        name: 'Provisioning integration device',
        authBindingMode: DeviceAuthBindingMode.UNPAIRED,
        status: DeviceStatus.ACTIVE,
      },
    });
    const config = {
      get: (key: string) =>
        ({
          WEBAUTHN_DEVICE_QUALIFICATION_APPROVED: true,
          WEBAUTHN_RP_ID: 'localhost',
          WEBAUTHN_ALLOWED_ORIGINS: 'http://localhost',
          SESSION_SECRET: 'integration-session-secret',
          CSRF_SECRET: 'integration-csrf-secret',
        })[key],
    };
    const branchesService = new BranchesService(
      prisma as never,
      auditStub() as never,
      config as never,
    );
    const enrollment = await branchesService.createDeviceEnrollment(
      seed.tenant.id,
      seed.actor,
      device.id,
    );
    const challenge = await prisma.deviceEnrollmentChallenge.findFirstOrThrow({
      where: { deviceId: device.id },
    });
    const credentialId = 'integration-credential-id';
    const publicKey = Buffer.from('integration-public-key-material');
    const registrationVerifier =
      WebAuthnServer.verifyRegistrationResponse as jest.Mock;
    registrationVerifier.mockResolvedValue({
      verified: true,
      registrationInfo: {
        fmt: 'packed',
        aaguid: '2fc0579f-8113-47ea-b116-bb5a8db9202a',
        credential: {
          id: credentialId,
          publicKey,
          counter: 0,
          transports: ['internal'],
        },
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        userVerified: true,
        attestationObject: Buffer.from('attestation-object'),
      } as never,
    });
    // Synthetic local statement: this exercises the production qualification
    // checks without depending on the remote FIDO MDS or claiming hardware trust.
    const metadataInitialize = jest.spyOn(
      WebAuthnServer.MetadataService,
      'initialize',
    );
    const metadataStatement = jest.spyOn(
      WebAuthnServer.MetadataService,
      'getStatement',
    );
    metadataInitialize.mockResolvedValue(undefined);
    metadataStatement.mockResolvedValue({
      aaguid: '2fc0579f-8113-47ea-b116-bb5a8db9202a',
      keyProtection: ['hardware'],
    } as never);
    await branchesService.completeDeviceEnrollment(
      device.id,
      enrollment.authorizationToken,
      {
        id: credentialId,
        rawId: credentialId,
        type: 'public-key',
        response: { transports: ['internal'] },
        authenticatorAttachment: 'platform',
      },
    );

    const pairedDevice = await prisma.device.findUniqueOrThrow({
      where: { id: device.id },
    });
    const persistedCredential =
      await prisma.deviceWebAuthnCredential.findFirstOrThrow({
        where: { deviceId: device.id },
      });
    const consumedChallenge =
      await prisma.deviceEnrollmentChallenge.findUniqueOrThrow({
        where: { id: challenge.id },
      });
    expect(pairedDevice.authBindingMode).toBe(DeviceAuthBindingMode.WEBAUTHN);
    expect(persistedCredential.status).toBe(
      DeviceWebAuthnCredentialStatus.ACTIVE,
    );
    expect(persistedCredential.publicKey).toEqual(publicKey);
    expect(persistedCredential.credentialId).toBe(credentialId);
    expect(consumedChallenge.consumedAt).not.toBeNull();

    const supabasePublicClient = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { user: { id: cashier.supabaseAuthId } },
          error: null,
        }),
      },
    };
    const authService = new AuthService(
      prisma as never,
      { publicClient: supabasePublicClient } as never,
      config as never,
      auditStub() as never,
    );
    const login = await authService.login(
      cashier.username,
      'password',
      device.id,
    );
    expect(login).toMatchObject({
      statusCode: 202,
      code: 'DEVICE_ASSERTION_REQUIRED',
    });
    if (!('attemptToken' in login)) throw new Error('WebAuthn attempt missing');
    expect(await prisma.session.count({ where: { userId: cashier.id } })).toBe(
      0,
    );

    const verifyAssertion =
      WebAuthnServer.verifyAuthenticationResponse as jest.Mock;
    verifyAssertion.mockResolvedValue({
      verified: true,
      authenticationInfo: {
        newCounter: 1,
        userVerified: true,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
      },
    });
    const completed = await authService.completeCashierLogin(
      login.attemptToken,
      {
        id: credentialId,
        rawId: credentialId,
        type: 'public-key',
        response: {},
      },
    );
    const session = await prisma.session.findUniqueOrThrow({
      where: { id: completed.context.session.id },
    });
    expect(session.deviceId).toBe(device.id);
    expect(session.deviceCredentialId).toBe(persistedCredential.id);
    expect(session.status).toBe(SessionStatus.ACTIVE);

    await branchesService.updateDevice(
      seed.tenant.id,
      seed.actor,
      device.id,
      { status: DeviceStatus.INACTIVE },
      'webauthn-provisioning-deactivate',
    );
    const deviceSessions = await prisma.session.findMany({
      where: { deviceId: device.id },
    });
    expect(deviceSessions).toHaveLength(1);
    expect(deviceSessions[0].status).toBe(SessionStatus.REVOKED);
    expect(deviceSessions[0].revokedAt).not.toBeNull();

    registrationVerifier.mockRestore();
    verifyAssertion.mockRestore();
    metadataInitialize.mockRestore();
    metadataStatement.mockRestore();
  }, 120000);

  it('keeps UNPAIRED, HMAC_LEGACY, and WEBAUTHN proof paths exclusive', async () => {
    const seed = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub(),
    });
    const cashier = await prisma.user.findUniqueOrThrow({
      where: { id: '00000000-0000-4000-8000-000000000004' },
    });
    const unpairedDevice = await prisma.device.create({
      data: {
        tenantId: seed.tenant.id,
        branchId: seed.branch.id,
        name: 'Exclusive-mode unpaired device',
        authBindingMode: DeviceAuthBindingMode.UNPAIRED,
        status: DeviceStatus.ACTIVE,
      },
    });
    const legacySecret = randomBytes(32).toString('base64url');
    const hmacDevice = await prisma.device.create({
      data: {
        tenantId: seed.tenant.id,
        branchId: seed.branch.id,
        name: 'Exclusive-mode HMAC device',
        authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
        attestationSecretCiphertext: encryptDeviceAttestationSecret(
          legacySecret,
          'integration-device-kek',
        ),
        attestationSecretVersion: 1,
        attestationSecretRotatedAt: new Date(),
        status: DeviceStatus.ACTIVE,
      },
    });
    const webAuthnDevice = await prisma.device.create({
      data: {
        tenantId: seed.tenant.id,
        branchId: seed.branch.id,
        name: 'Exclusive-mode WebAuthn device',
        authBindingMode: DeviceAuthBindingMode.WEBAUTHN,
        pairedAt: new Date(),
        status: DeviceStatus.ACTIVE,
      },
    });
    const webAuthnCredential = await prisma.deviceWebAuthnCredential.create({
      data: {
        tenantId: seed.tenant.id,
        deviceId: webAuthnDevice.id,
        credentialId: 'exclusive-mode-credential',
        publicKey: Buffer.from('integration-only-public-key'),
        aaguid: '00000000-0000-0000-0000-000000000000',
        authenticatorAttachment: 'platform',
        backupEligible: false,
        backedUp: false,
        attestationFormat: 'packed',
        attestationTrustResult: DeviceAttestationTrustResult.TRUSTED,
        rpId: 'localhost',
        status: DeviceWebAuthnCredentialStatus.ACTIVE,
        pairedAt: new Date(),
      },
    });
    const config = {
      get: (key: string) =>
        ({
          WEBAUTHN_DEVICE_QUALIFICATION_APPROVED: true,
          WEBAUTHN_RP_ID: 'localhost',
          WEBAUTHN_ALLOWED_ORIGINS: 'http://localhost',
          DEVICE_ATTESTATION_KEK: 'integration-device-kek',
          SESSION_SECRET: 'integration-session-secret',
          CSRF_SECRET: 'integration-csrf-secret',
        })[key],
    };
    const supabasePublicClient = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { user: { id: cashier.supabaseAuthId } },
          error: null,
        }),
      },
    };
    const authService = new AuthService(
      prisma as never,
      { publicClient: supabasePublicClient } as never,
      config as never,
      auditStub() as never,
    );

    await expect(
      authService.login(cashier.username, 'password', unpairedDevice.id),
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'DEVICE_AUTH_FAILED' },
    });
    expect(
      await prisma.session.count({ where: { deviceId: unpairedDevice.id } }),
    ).toBe(0);

    const timestamp = Date.now();
    const nonce = randomUUID();
    const signature = createHmac('sha256', legacySecret)
      .update(`${hmacDevice.id}.${timestamp}.${nonce}`)
      .digest('base64url');
    await authService.login(
      cashier.username,
      'password',
      hmacDevice.id,
      `${timestamp}.${nonce}.${signature}`,
    );
    const hmacSession = await prisma.session.findFirstOrThrow({
      where: { deviceId: hmacDevice.id },
    });
    expect(hmacSession).toMatchObject({
      deviceId: hmacDevice.id,
      deviceCredentialId: null,
      status: SessionStatus.ACTIVE,
    });

    const webAuthnLogin = await authService.login(
      cashier.username,
      'password',
      webAuthnDevice.id,
      'legacy-hmac-proof-is-not-accepted',
    );
    expect(webAuthnLogin).toMatchObject({
      statusCode: 202,
      code: 'DEVICE_ASSERTION_REQUIRED',
    });
    expect(
      await prisma.session.count({ where: { deviceId: webAuthnDevice.id } }),
    ).toBe(0);
    expect(webAuthnCredential.status).toBe(
      DeviceWebAuthnCredentialStatus.ACTIVE,
    );
  }, 120000);
});

function auditStub() {
  return {
    record: () => Promise.resolve(undefined),
    recordWithClient: () => Promise.resolve(undefined),
  };
}

function createSupabaseAdminStub() {
  return {
    auth: {
      admin: {
        listUsers: jest
          .fn()
          .mockResolvedValue({ data: { users: [] }, error: null }),
        createUser: jest
          .fn()
          .mockImplementation(({ email }: { email: string }) =>
            Promise.resolve({
              data: { user: { id: `test-${email}`, email } },
              error: null,
            }),
          ),
        updateUserById: jest
          .fn()
          .mockResolvedValue({ data: { user: {} }, error: null }),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
      },
    },
  };
}
