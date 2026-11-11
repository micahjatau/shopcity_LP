import { createApiRequest } from './request';

export type PasswordRecoveryResponse = {
  status: number;
  data: Record<string, unknown>;
};

async function postPasswordRecovery(
  path: string,
  body: Record<string, string>,
): Promise<PasswordRecoveryResponse> {
  const request = createApiRequest({
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const response = await fetch(path, {
    ...request,
    referrerPolicy: 'same-origin',
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        data = parsed as Record<string, unknown>;
      }
    } catch {
      data = {};
    }
  }
  return { status: response.status, data };
}

export function requestPasswordRecovery(email: string) {
  return postPasswordRecovery('/api/v1/auth/password-reset/request', { email });
}

export function completePasswordRecovery(input: {
  accessToken: string;
  refreshToken: string;
  type: 'recovery';
  password: string;
}) {
  return postPasswordRecovery('/api/v1/auth/password-reset/complete', input);
}
