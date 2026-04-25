import { ApiError } from '@/src/lib/api/errors';
import { logEvent } from '@/src/lib/telemetry/analytics';

export type HandledError = {
  userMessage: string;
  kind: 'network' | 'timeout' | 'server' | 'validation' | 'unknown';
  status?: number;
};

export function handleApiError(error: unknown, context?: { feature?: string; action?: string }): HandledError {
  // Timeout (from ApiError mapping)
  if (error instanceof ApiError && (error.status === 408 || error.code === 'TIMEOUT')) {
    logEvent('timeout', { feature: context?.feature ?? 'unknown', action: context?.action ?? 'unknown' });
    return { userMessage: 'Server terlalu lama merespon', kind: 'timeout', status: error.status };
  }

  // ApiError (HTTP)
  if (error instanceof ApiError) {
    const status = error.status;

    if (status === 0) {
      logEvent('api_error', { feature: context?.feature ?? 'unknown', status, code: error.code });
      return { userMessage: 'Koneksi bermasalah', kind: 'network', status };
    }

    if (status >= 500) {
      logEvent('api_error', { feature: context?.feature ?? 'unknown', status, code: error.code });
      return { userMessage: 'Terjadi kesalahan sistem', kind: 'server', status };
    }

    if (status === 400 || status === 422) {
      // Validation-like error: show message (already curated by backend)
      return { userMessage: error.message, kind: 'validation', status };
    }

    // default: show safe message
    logEvent('api_error', { feature: context?.feature ?? 'unknown', status, code: error.code });
    return { userMessage: error.message || 'Terjadi kesalahan', kind: 'unknown', status };
  }

  // Fetch/network errors usually come as TypeError
  if (error instanceof TypeError) {
    logEvent('api_error', { feature: context?.feature ?? 'unknown', kind: 'network' });
    return { userMessage: 'Koneksi bermasalah', kind: 'network' };
  }

  logEvent('api_error', { feature: context?.feature ?? 'unknown', kind: 'unknown' });
  return { userMessage: 'Terjadi kesalahan', kind: 'unknown' };
}

