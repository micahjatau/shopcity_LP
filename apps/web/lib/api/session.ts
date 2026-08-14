import {
  authControllerLoginV1,
  authControllerLogoutV1,
  authControllerMeV1,
  authControllerRefreshV1,
  type AuthControllerMeV1200Data,
  type LoginDto,
} from './generated-client';
import { classifyApiError } from './errors';
import { createApiRequest } from './request';

let refreshPromise: Promise<AuthControllerMeV1200Data | null> | null = null;

export async function getCurrentSession(): Promise<AuthControllerMeV1200Data> {
  const response = await authControllerMeV1(createApiRequest());

  if (response.status === 200) {
    return response.data.data;
  }

  throw Object.assign(new Error('Session unavailable'), {
    statusCode: response.status,
    category: classifyApiError(
      (response as { data?: unknown }).data,
      response.status,
    ),
    response,
  });
}

export async function loginWithCredentials(payload: LoginDto) {
  return authControllerLoginV1(payload, createApiRequest());
}

export async function logoutSession() {
  return authControllerLogoutV1(createApiRequest({ csrf: true }));
}

export async function refreshSessionOnce() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await authControllerRefreshV1(createApiRequest());
      return response.status === 200 ? response.data.data : null;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function bootstrapSession(): Promise<AuthControllerMeV1200Data | null> {
  try {
    return await getCurrentSession();
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error && 'statusCode' in error
        ? Number((error as { statusCode?: unknown }).statusCode ?? 0)
        : 0;

    if (statusCode === 401 || statusCode === 403) {
      await refreshSessionOnce();
      try {
        return await getCurrentSession();
      } catch {
        return null;
      }
    }

    return null;
  }
}

export type { AuthControllerMeV1200Data } from './generated-client';
