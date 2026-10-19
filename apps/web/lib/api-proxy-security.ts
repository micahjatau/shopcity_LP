export const SHOPCITY_BFF_TOKEN_HEADER = 'x-shopcity-bff-token';
export const SHOPCITY_DEPLOYMENT_ENV_HEADER =
  'x-shopcity-deployment-environment';

export type ShopcityDeploymentEnvironment =
  'local' | 'test' | 'ci' | 'preview' | 'staging' | 'production';

type Environment = Record<string, string | undefined>;

const deploymentEnvironments = new Set<ShopcityDeploymentEnvironment>([
  'local',
  'test',
  'ci',
  'preview',
  'staging',
  'production',
]);

const localOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3100',
  'http://127.0.0.1:3100',
];

export function resolveShopcityDeploymentEnvironment(
  env: Environment = process.env,
): ShopcityDeploymentEnvironment | null {
  const configured = env.SHOPCITY_DEPLOYMENT_ENV?.trim().toLowerCase();
  const vercelTarget = env.VERCEL_TARGET_ENV?.trim().toLowerCase();
  const vercelEnvironment = env.VERCEL_ENV?.trim().toLowerCase();

  if (configured) {
    if (
      !deploymentEnvironments.has(configured as ShopcityDeploymentEnvironment)
    ) {
      return null;
    }
    if (vercelTarget && vercelTarget !== configured) return null;
    if (vercelEnvironment === 'production' && configured !== 'production') {
      return null;
    }
    if (
      vercelEnvironment === 'preview' &&
      configured !== 'preview' &&
      configured !== 'staging'
    ) {
      return null;
    }
    if (vercelEnvironment === 'development' && configured !== 'local') {
      return null;
    }
    return configured as ShopcityDeploymentEnvironment;
  }

  if (vercelTarget || vercelEnvironment) return null;
  if (env.NODE_ENV === 'development') return 'local';
  if (env.NODE_ENV === 'test') return 'test';
  return null;
}

export function resolveShopcityBackendBaseUrl(
  env: Environment = process.env,
): string | null {
  const deploymentEnvironment = resolveShopcityDeploymentEnvironment(env);
  if (!deploymentEnvironment) return null;

  const configuredBackend = env.SHOPCITY_BACKEND_URL?.trim();
  const configuredApi = env.SHOPCITY_API_BASE_URL?.trim();
  if (
    configuredBackend &&
    configuredApi &&
    configuredBackend !== configuredApi
  ) {
    return null;
  }

  const value = configuredBackend || configuredApi;
  if (!value) {
    if (deploymentEnvironment === 'local' || deploymentEnvironment === 'test') {
      return 'http://127.0.0.1:3000';
    }
    return null;
  }

  try {
    const url = new URL(value);
    const localHost =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '[::1]';
    if (
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      (deploymentEnvironment !== 'local' &&
        deploymentEnvironment !== 'test' &&
        (url.protocol !== 'https:' || localHost)) ||
      (url.protocol !== 'https:' && url.protocol !== 'http:')
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function isTrustedShopcityBrowserOrigin(
  origin: string | null | undefined,
  referer: string | null | undefined,
  env: Environment = process.env,
): boolean {
  const deploymentEnvironment = resolveShopcityDeploymentEnvironment(env);
  if (!deploymentEnvironment) return false;

  // Match the backend contract: Referer is considered only when Origin is absent.
  const candidate = origin === null || origin === undefined ? referer : origin;
  if (!candidate) return false;

  let requestOrigin: string;
  try {
    const parsed = new URL(candidate);
    requestOrigin = parsed.origin;
    if (
      parsed.username ||
      parsed.password ||
      (origin !== null && origin !== undefined && parsed.origin !== origin)
    ) {
      return false;
    }
  } catch {
    return false;
  }

  const configuredOrigins = env.SHOPCITY_WEB_ORIGINS;
  const allowedOrigins = new Set<string>();
  if (configuredOrigins?.trim()) {
    for (const value of configuredOrigins.split(',')) {
      const normalized = parseCanonicalOrigin(value.trim());
      if (!normalized) return false;
      allowedOrigins.add(normalized);
    }
  }

  if (deploymentEnvironment === 'local' || deploymentEnvironment === 'test') {
    for (const localOrigin of localOrigins) allowedOrigins.add(localOrigin);
  }

  if (env.VERCEL_ENV === 'preview') {
    for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL]) {
      const generatedOrigin = vercelHostOrigin(host);
      if (generatedOrigin) allowedOrigins.add(generatedOrigin);
    }
  }

  if (
    deploymentEnvironment !== 'local' &&
    deploymentEnvironment !== 'test' &&
    !requestOrigin.startsWith('https://')
  ) {
    return false;
  }

  return allowedOrigins.has(requestOrigin);
}

export function requiresShopcityBffIdentity(
  pathname: string,
  method: string,
): boolean {
  if (method.toUpperCase() !== 'POST') return false;
  return (
    pathname === '/api/v1/auth/login' ||
    pathname === '/api/v1/auth/cashier-login/complete'
  );
}

export function resolveShopcityBffHeaders(
  env: Environment = process.env,
): Record<string, string> | null {
  const deploymentEnvironment = resolveShopcityDeploymentEnvironment(env);
  if (!deploymentEnvironment) return null;

  const secret = env.SHOPCITY_BFF_SHARED_SECRET?.trim();
  const requiresSecret = !['local', 'test', 'ci'].includes(
    deploymentEnvironment,
  );
  if (requiresSecret && !isBffSecretFormatValid(secret)) return null;
  if (secret && !isBffSecretFormatValid(secret)) return null;

  const headers: Record<string, string> = {
    [SHOPCITY_DEPLOYMENT_ENV_HEADER]: deploymentEnvironment,
  };
  if (secret) headers[SHOPCITY_BFF_TOKEN_HEADER] = secret;
  return headers;
}

export function isBffSecretFormatValid(
  value: string | undefined,
): value is string {
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) return false;
  const decoded = Buffer.from(value, 'base64url');
  return decoded.length === 32 && decoded.toString('base64url') === value;
}

function parseCanonicalOrigin(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (
      parsed.origin !== value ||
      parsed.username ||
      parsed.password ||
      (parsed.protocol !== 'https:' &&
        !(
          parsed.protocol === 'http:' &&
          (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
        ))
    ) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function vercelHostOrigin(value: string | undefined): string | null {
  const host = value?.trim().toLowerCase();
  if (!host || host.includes('/') || host.includes('@') || host.includes(':')) {
    return null;
  }
  try {
    const parsed = new URL(`https://${host}`);
    return parsed.hostname === host && parsed.pathname === '/'
      ? parsed.origin
      : null;
  } catch {
    return null;
  }
}
