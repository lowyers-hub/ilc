import { env } from '@/src/lib/env';
import { clearTokens, getTokens, setTokens, type AuthTokens } from '@/src/lib/auth/tokens';

import { ApiError, parseApiError } from './errors';

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  auth?: boolean;
  timeoutMs?: number;
  timeoutLabel?: string;
};

let refreshInFlight: Promise<AuthTokens | null> | null = null;

async function refreshTokens(): Promise<AuthTokens | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const tokens = await getTokens();
    if (!tokens?.refreshToken) return null;

    const res = await fetch(`${env.apiUrl}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    if (!res.ok) {
      await clearTokens();
      return null;
    }

    const data = (await res.json()) as { tokens: AuthTokens };
    await setTokens(data.tokens);
    return data.tokens;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function requestRaw(path: string, options: RequestOptions): Promise<Response> {
  if (!env.apiUrl) {
    throw new ApiError({ status: 0, message: 'Missing EXPO_PUBLIC_API_URL' });
  }

  const url = path.startsWith('http') ? path : `${env.apiUrl}${path}`;
  const headers: Record<string, string> = { ...(options.headers ?? {}) };

  if (options.auth) {
    const tokens = await getTokens();
    if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timeoutId: any = null;
  if (options.timeoutMs && controller) {
    timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);
  }

  try {
    return await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ?? null,
      signal: controller?.signal,
    });
  } catch (e: any) {
    // Normalize abort errors as ApiError(status=408) to be mapped by handleApiError.
    if (e?.name === 'AbortError') {
      throw new ApiError({ status: 408, message: 'Timeout', code: 'TIMEOUT' });
    }
    // fetch throws TypeError for network errors in many environments
    throw e;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function requestJson<T>(
  path: string,
  options: Omit<RequestOptions, 'headers' | 'body'> & { body?: any; headers?: Record<string, string> } = {}
): Promise<T> {
  const res = await requestRaw(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? null : JSON.stringify(options.body),
  });

  if (res.status === 401 && options.auth) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      const retry = await requestRaw(path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
          Authorization: `Bearer ${refreshed.accessToken}`,
        },
        body: options.body === undefined ? null : JSON.stringify(options.body),
      });

      if (!retry.ok) throw await parseApiError(retry);
      return (await retry.json()) as T;
    }
  }

  if (!res.ok) throw await parseApiError(res);
  return (await res.json()) as T;
}

export async function requestMultipart<T>(
  path: string,
  form: FormData,
  options: Omit<RequestOptions, 'headers' | 'body'> & { headers?: Record<string, string> } = {}
): Promise<T> {
  const res = await requestRaw(path, {
    ...options,
    // IMPORTANT: do not set Content-Type manually for multipart/form-data
    headers: { ...(options.headers ?? {}) },
    body: form,
  });

  if (res.status === 401 && options.auth) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      const retry = await requestRaw(path, {
        ...options,
        headers: {
          ...(options.headers ?? {}),
          Authorization: `Bearer ${refreshed.accessToken}`,
        },
        body: form,
      });
      if (!retry.ok) throw await parseApiError(retry);
      return (await retry.json()) as T;
    }
  }

  if (!res.ok) throw await parseApiError(res);
  return (await res.json()) as T;
}
