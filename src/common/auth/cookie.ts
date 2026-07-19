export function parseCookies(
  cookieHeader: string | undefined,
): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(';')
    .reduce<Record<string, string>>((cookies, entry) => {
      const [rawName, ...rawValue] = entry.trim().split('=');
      if (!rawName) {
        return cookies;
      }

      cookies[rawName] = decodeURIComponent(rawValue.join('='));
      return cookies;
    }, {});
}

export function buildCookie(
  name: string,
  value: string,
  maxAgeSeconds?: number,
  secure = false,
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax',
    'HttpOnly',
  ];
  if (secure) {
    parts.push('Secure');
  }
  if (maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  }

  return parts.join('; ');
}

export function buildCsrfCookie(
  name: string,
  value: string,
  maxAgeSeconds?: number,
  secure = false,
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax',
  ];
  if (secure) {
    parts.push('Secure');
  }
  if (maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  }

  return parts.join('; ');
}

export function clearCookie(name: string, secure = false): string {
  return `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${secure ? '; Secure' : ''}`;
}
