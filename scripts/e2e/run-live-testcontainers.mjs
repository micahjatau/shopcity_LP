import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Wait } from 'testcontainers';
import disposableTargetModule from './assert-disposable-target.cjs';
import {
  startSupabaseAuthStub,
  TEST_SUPABASE_ANON_KEY,
  TEST_SUPABASE_SERVICE_ROLE_KEY,
} from './supabase-auth-stub.mjs';

const { assertDisposableTarget } = disposableTargetModule;
const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const WEB = path.join(ROOT, 'apps/web');
const activeChildren = new Set();
let requestedSignal;
const KIB = 1024;
const MIB = 1024 * KIB;
const GIB = 1024 * MIB;
const MIN_AVAILABLE_RAM_KIB = (5 * GIB) / KIB;
const MIN_FREE_SWAP_KIB = GIB / KIB;

function isLocalDockerEndpoint(endpoint) {
  return (
    endpoint.startsWith('unix://') ||
    endpoint.startsWith('npipe://') ||
    /^tcp:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(endpoint)
  );
}

function bindContainerPortsToLoopback(container, ports) {
  const hostConfig = container.hostConfig;
  if (!hostConfig?.PortBindings) {
    throw new Error('Testcontainers did not create expected port bindings.');
  }
  for (const port of ports) {
    const binding = hostConfig.PortBindings[`${port}/tcp`];
    if (!binding?.length) {
      throw new Error(`Testcontainers did not expose container port ${port}.`);
    }
    hostConfig.PortBindings[`${port}/tcp`] = binding.map((entry) => ({
      ...entry,
      HostIp: '127.0.0.1',
      HostPort: '0',
    }));
  }
  return container;
}

function assertLocalDockerTarget() {
  const configuredHost = process.env.DOCKER_HOST?.trim();
  if (configuredHost && !isLocalDockerEndpoint(configuredHost)) {
    throw new Error('Refusing a non-local Docker endpoint for disposable E2E.');
  }

  if (!configuredHost) {
    const contextResult = spawnSync('docker', ['context', 'show'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (contextResult.status !== 0) {
      throw new Error('Unable to verify the active local Docker context.');
    }
    const context =
      process.env.DOCKER_CONTEXT?.trim() || contextResult.stdout.trim();
    const endpointResult = spawnSync(
      'docker',
      ['context', 'inspect', context, '--format', '{{.Endpoints.docker.Host}}'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const endpoint = endpointResult.stdout.trim();
    if (endpointResult.status !== 0 || !isLocalDockerEndpoint(endpoint)) {
      throw new Error(
        'Refusing a non-local Docker context for disposable E2E.',
      );
    }
  }

  const hostOverride = process.env.TESTCONTAINERS_HOST_OVERRIDE?.trim();
  if (
    hostOverride &&
    !['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostOverride)
  ) {
    throw new Error('Refusing a non-loopback Testcontainers host override.');
  }
}

async function assertResourceHeadroom() {
  let contents;
  try {
    contents = await readFile('/proc/meminfo', 'utf8');
  } catch {
    throw new Error(
      'Cannot verify available RAM and swap; refusing E2E startup.',
    );
  }

  const values = new Map(
    [
      ...contents.matchAll(
        /^(MemAvailable|SwapFree|SwapTotal):\s+(\d+)\s+kB$/gm,
      ),
    ].map(([, name, value]) => [name, Number(value)]),
  );
  const availableRam = values.get('MemAvailable');
  const freeSwap = values.get('SwapFree');
  const totalSwap = values.get('SwapTotal');
  if (
    availableRam === undefined ||
    freeSwap === undefined ||
    totalSwap === undefined
  ) {
    throw new Error('Incomplete RAM/swap telemetry; refusing E2E startup.');
  }

  process.stdout.write(
    `Resource preflight: RAM available ${(availableRam / (GIB / KIB)).toFixed(1)} GiB; swap free ${(freeSwap / (GIB / KIB)).toFixed(1)} / ${(totalSwap / (GIB / KIB)).toFixed(1)} GiB.\n`,
  );
  const processSnapshot = spawnSync(
    'ps',
    ['-eo', 'pid=,comm=,rss=', '--sort=-rss'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  if (processSnapshot.status === 0) {
    const consumers = processSnapshot.stdout
      .trim()
      .split('\n')
      .slice(0, 8)
      .map((line) => {
        const match = line.trim().match(/^(\d+)\s+(.+?)\s+(\d+)$/);
        return match
          ? `${match[1]} ${match[2]} ${(Number(match[3]) / 1024).toFixed(0)} MiB RSS`
          : null;
      })
      .filter(Boolean);
    process.stdout.write(
      `Top local memory consumers: ${consumers.join('; ')}\n`,
    );
  }
  if (
    availableRam < MIN_AVAILABLE_RAM_KIB ||
    (totalSwap > 0 && freeSwap < MIN_FREE_SWAP_KIB)
  ) {
    throw new Error(
      'Insufficient resource headroom: require at least 5 GiB available RAM and, when swap is configured, 1 GiB free swap.',
    );
  }
}

function makeChildEnvironment(home, values = {}) {
  return {
    PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
    HOME: home,
    TMPDIR: home,
    TZ: 'UTC',
    CI: '1',
    ...values,
  };
}

function createManagedChild(command, args, options, label) {
  const child = spawn(command, args, {
    ...options,
    detached: process.platform !== 'win32',
    stdio: 'inherit',
  });
  child.label = label;
  activeChildren.add(child);
  child.once('exit', () => activeChildren.delete(child));
  return child;
}

function signalOwnedChild(child, signal) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null)
    return;
  try {
    if (process.platform !== 'win32') process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    child.kill(signal);
  }
}

async function stopOwnedChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  signalOwnedChild(child, 'SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]);
  if (child.exitCode === null && child.signalCode === null) {
    signalOwnedChild(child, 'SIGKILL');
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  }
}

async function runCommand(command, args, options, label, timeoutMs) {
  const child = createManagedChild(command, args, options, label);
  return await new Promise((resolve, reject) => {
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      signalOwnedChild(child, 'SIGTERM');
      setTimeout(() => signalOwnedChild(child, 'SIGKILL'), 4000).unref();
    }, timeoutMs);

    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`${label} could not start: ${error.message}`));
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(new Error(`${label} exceeded its ${timeoutMs} ms limit.`));
      } else if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`${label} failed (exit ${code ?? signal ?? 'unknown'}).`),
        );
      }
    });
  });
}

async function reserveLoopbackPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    await new Promise((resolve) => server.close(resolve));
    throw new Error('Unable to reserve a local E2E port.');
  }
  const port = address.port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function waitForHttp(
  url,
  expectedStatus,
  label,
  child,
  timeoutMs = 90000,
) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = 'no response';
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) {
      throw new Error(`${label} exited before becoming ready.`);
    }
    if (child?.signalCode) {
      throw new Error(`${label} was terminated before becoming ready.`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
      lastStatus = String(response.status);
      await response.arrayBuffer();
      if (response.status === expectedStatus) return;
    } catch {
      lastStatus = 'connection unavailable';
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} was not ready (last HTTP status: ${lastStatus}).`);
}

async function stopContainer(container, label) {
  if (!container) return;
  try {
    await container.stop();
  } catch (error) {
    process.stderr.write(
      `${label} teardown failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
    );
  }
}

async function cleanup(resources) {
  for (const child of [...activeChildren].reverse()) {
    await stopOwnedChild(child);
  }
  try {
    await resources.authStub?.close();
  } catch (error) {
    process.stderr.write(
      `Auth stub teardown failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
    );
  }
  await stopContainer(resources.redis, 'Redis container');
  await stopContainer(resources.postgres, 'PostgreSQL container');

  if (resources.distPath) {
    try {
      const info = await lstat(resources.distPath);
      if (!info.isSymbolicLink()) {
        await rm(resources.distPath, { recursive: true, force: true });
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        process.stderr.write('Owned Next test output could not be removed.\n');
      }
    }
  }
  if (resources.tempRoot) {
    await rm(resources.tempRoot, { recursive: true, force: true }).catch(() => {
      process.stderr.write(
        'Owned E2E temporary directory could not be removed.\n',
      );
    });
  }
}

async function main() {
  assertLocalDockerTarget();
  await assertResourceHeadroom();
  const checkInterrupted = () => {
    if (requestedSignal) {
      throw new Error(`E2E interrupted by ${requestedSignal}.`);
    }
  };

  const runId = randomUUID();
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'shopcity-e2e-'));
  const home = path.join(tempRoot, 'home');
  const distRelative = `.next-live-e2e-${runId}`;
  const distPath = path.resolve(WEB, distRelative);
  const resources = { tempRoot, distPath };
  let failed = false;

  try {
    await mkdir(home, { recursive: true, mode: 0o700 });
    process.stdout.write(
      'Starting owned, resource-limited Postgres and Redis containers.\n',
    );
    const password = randomBytes(24).toString('hex');
    const postgresContainer = bindContainerPortsToLoopback(
      new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('shopcity_e2e')
        .withUsername('shopcity_e2e')
        .withPassword(password),
      [5432],
    );
    resources.postgres = await postgresContainer
      .withResourcesQuota({ memory: 1.5, cpu: 1 })
      .withLabels({
        'shopcity.test-runner': 'live-e2e',
        'shopcity.run-id': runId,
      })
      .withStartupTimeout(120000)
      .start();
    checkInterrupted();

    const redisContainer = bindContainerPortsToLoopback(
      new GenericContainer('redis:7-alpine').withExposedPorts(6379),
      [6379],
    );
    resources.redis = await redisContainer
      .withResourcesQuota({ memory: 0.25, cpu: 0.25 })
      .withLabels({
        'shopcity.test-runner': 'live-e2e',
        'shopcity.run-id': runId,
      })
      .withWaitStrategy(Wait.forListeningPorts())
      .withStartupTimeout(60000)
      .start();
    checkInterrupted();

    resources.authStub = await startSupabaseAuthStub();
    checkInterrupted();
    await waitForHttp(
      `${resources.authStub.url}/auth/v1/health`,
      200,
      'Local Supabase Auth stub',
    );
    checkInterrupted();

    const databaseUrl = new URL(resources.postgres.getConnectionUri());
    databaseUrl.hostname = '127.0.0.1';
    databaseUrl.searchParams.set('schema', 'public');
    const redisUrl = `redis://127.0.0.1:${resources.redis.getMappedPort(6379)}`;
    const apiPort = await reserveLoopbackPort();
    const webPort = await reserveLoopbackPort();
    const apiOrigin = `http://127.0.0.1:${apiPort}`;
    const webOrigin = `http://127.0.0.1:${webPort}`;
    const bffSecret = randomBytes(32).toString('base64url');
    const adminPassword = randomBytes(24).toString('base64url');
    const sessionSecret = randomBytes(32).toString('base64url');
    const csrfSecret = randomBytes(32).toString('base64url');
    const attestationKek = randomBytes(32).toString('base64url');

    const testEnvironment = makeChildEnvironment(home, {
      NODE_ENV: 'test',
      SHOPCITY_E2E_DISPOSABLE: '1',
      SHOPCITY_DEPLOYMENT_ENV: 'local',
      SHOPCITY_BFF_SHARED_SECRET: bffSecret,
      SHOPCITY_BACKEND_URL: apiOrigin,
      SHOPCITY_API_BASE_URL: apiOrigin,
      SHOPCITY_WEB_ORIGINS: webOrigin,
      CORS_ORIGIN_ALLOWLIST: webOrigin,
      DATABASE_URL: databaseUrl.toString(),
      REDIS_URL: redisUrl,
      SUPABASE_URL: resources.authStub.url,
      SUPABASE_ANON_KEY: TEST_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: TEST_SUPABASE_SERVICE_ROLE_KEY,
      DEFAULT_PUBLIC_TENANT_ID: '00000000-0000-4000-8000-000000000001',
      DEFAULT_PUBLIC_BRANCH_ID: '00000000-0000-4000-8000-000000000002',
      DEFAULT_ADMIN_PASSWORD: adminPassword,
      SHOPCITY_LIVE_ADMIN_USERNAME: 'admin@shopcity.local',
      SHOPCITY_LIVE_ADMIN_PASSWORD: adminPassword,
      SHOPCITY_LIVE_E2E: '1',
      SHOPCITY_TIMEZONE: 'Africa/Lagos',
      RECEIPT_WEEK_START_DAY: '1',
      DEFAULT_EARN_RATE_BPS: '200',
      SESSION_SECRET: sessionSecret,
      CSRF_SECRET: csrfSecret,
      DEVICE_ATTESTATION_KEK: attestationKek,
      DEVICE_ATTESTATION_KEK_VERSION: '1',
      PILOT_CASHIER_DEVICE_TOKEN_ONLY: 'false',
      SMS_PROVIDER_MODE: 'deterministic',
      SMS_PROVIDER_VENDOR: 'ebulksms',
      SENTRY_DSN: '',
      LOG_LEVEL: 'warn',
      LOG_PRETTY: 'false',
      RELEASE_SHA: 'testcontainers-live-e2e',
      TS_NODE_PROJECT: path.join(ROOT, 'tsconfig.json'),
      TS_NODE_TRANSPILE_ONLY: 'true',
      NODE_OPTIONS: '--max-old-space-size=768',
    });
    const target = assertDisposableTarget(testEnvironment);
    process.stdout.write(
      `Disposable targets verified: DB=${target.database}, Redis=${target.redis}, API=${target.api}, web=${target.web}.\n`,
    );

    process.stdout.write(
      'Applying migrations and seeding only the disposable database.\n',
    );
    await runCommand(
      'npm',
      ['run', 'e2e:live:prepare'],
      { cwd: ROOT, env: testEnvironment },
      'Disposable migration and seed',
      180000,
    );
    checkInterrupted();

    const apiEnvironment = {
      ...testEnvironment,
      PORT: String(apiPort),
      CORS_ORIGIN_ALLOWLIST: webOrigin,
    };
    const apiChild = createManagedChild(
      process.execPath,
      [
        '-r',
        path.join(ROOT, 'node_modules/ts-node/register/transpile-only'),
        '-r',
        path.join(ROOT, 'node_modules/tsconfig-paths/register'),
        path.join(ROOT, 'scripts/e2e/start-test-api.ts'),
      ],
      { cwd: tempRoot, env: apiEnvironment },
      'Nest API',
    );
    await waitForHttp(
      `${apiOrigin}/health/ready`,
      200,
      'Nest readiness',
      apiChild,
    );
    checkInterrupted();

    const webEnvironment = {
      ...testEnvironment,
      NODE_ENV: 'development',
      PORT: String(webPort),
      SHOPCITY_WEB_DIST_DIR: distRelative,
      NEXT_PUBLIC_DEV_CASHIER_TEST_SESSION_ENABLED: 'false',
      NEXT_PUBLIC_SHOPCITY_LEGACY_DEVICE_AUTH_ENABLED: 'true',
      NEXT_TELEMETRY_DISABLED: '1',
      VERCEL_ENV: 'development',
      VERCEL_TARGET_ENV: '',
    };
    const webChild = createManagedChild(
      'npm',
      [
        'run',
        'dev',
        '--',
        '--hostname',
        '127.0.0.1',
        '--port',
        String(webPort),
      ],
      { cwd: WEB, env: webEnvironment },
      'Next.js E2E server',
    );
    await waitForHttp(`${webOrigin}/login`, 200, 'Next.js frontend', webChild);
    checkInterrupted();

    process.stdout.write(
      'Running serialized backend-connected Playwright tests.\n',
    );
    await runCommand(
      'npm',
      ['run', 'e2e:live:test'],
      {
        cwd: ROOT,
        env: {
          ...testEnvironment,
          PLAYWRIGHT_BASE_URL: webOrigin,
          PLAYWRIGHT_SKIP_WEBSERVER: '1',
          SHOPCITY_BACKEND_URL: apiOrigin,
          SHOPCITY_LIVE_E2E: '1',
        },
      },
      'Backend-connected Playwright suite',
      12 * 60 * 1000,
    );
  } catch (error) {
    failed = true;
    process.stderr.write(
      `Disposable backend E2E failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
    );
  } finally {
    await cleanup(resources);
  }

  if (!failed) process.stdout.write('Disposable backend E2E passed.\n');
  if (failed) process.exitCode = 1;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    requestedSignal = signal;
    for (const child of activeChildren) signalOwnedChild(child, signal);
  });
}

await main().catch((error) => {
  process.stderr.write(
    `Disposable backend E2E did not start: ${error instanceof Error ? error.message : 'unknown preflight error'}\n`,
  );
  process.exitCode = 1;
});
