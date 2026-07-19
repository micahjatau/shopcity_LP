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
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax',
    'HttpOnly',
  ];
  if (maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  }

  return parts.join('; ');
}

export function buildCsrfCookie(
  name: string,
  value: string,
  maxAgeSeconds?: number,
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax',
  ];
  if (maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  }

  return parts.join('; ');
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
}
