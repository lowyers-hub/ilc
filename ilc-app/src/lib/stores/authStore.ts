import { create } from 'zustand';

import { clearTokens, getTokens, setTokens, type AuthTokens } from '@/src/lib/auth/tokens';
import { requestJson } from '@/src/lib/api/client';
import { env } from '@/src/lib/env';
import type { User } from '@/src/types/models';

type AuthStatus = 'unknown' | 'signedOut' | 'signedIn';

type StartOtpResponse = { verificationId: string; resendAfterSec: number };
type VerifyOtpResponse = { tokens?: AuthTokens; user?: User; accessToken?: string };

type AuthState = {
  status: AuthStatus;
  user: User | null;
  bootstrap: () => Promise<void>;

  startOtp: (phoneE164: string) => Promise<StartOtpResponse>;
  verifyOtp: (verificationId: string, code: string) => Promise<void>;

  refreshMe: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'unknown',
  user: null,

  bootstrap: async () => {
    const tokens = await getTokens();
    if (!tokens) {
      set({ status: 'signedOut', user: null });
      return;
    }

    if (env.useMockData) {
      set({
        status: 'signedIn',
        user: {
          id: 'user_mock',
          phoneE164: '+62',
          displayName: 'Demo User',
          createdAt: new Date().toISOString(),
          entitlements: { isPremium: false, features: {} },
        },
      });
      return;
    }

    try {
      const user = await requestJson<any>('/v1/users/me', { auth: true });
      set({
        status: 'signedIn',
        user: normalizeUser(user),
      });
    } catch {
      await clearTokens();
      set({ status: 'signedOut', user: null });
    }
  },

  startOtp: async (phoneE164: string) => {
    if (env.useMockData) {
      return { verificationId: `mock_${phoneE164}`, resendAfterSec: 1 };
    }
    // Production backend currently uses /v1/auth/login (no OTP). Keep UI flow:
    // - screen 1 collects phone
    // - screen 2 "verifies" (calls login)
    return { verificationId: phoneE164, resendAfterSec: 0 };
  },

  verifyOtp: async (verificationId: string, code: string) => {
    if (env.useMockData) {
      if (code !== '123456') throw new Error('Invalid demo OTP (use 123456)');
      const tokens: AuthTokens = {
        accessToken: 'mock_access',
        refreshToken: 'mock_refresh',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
      await setTokens(tokens);
      set({
        status: 'signedIn',
        user: normalizeUser({
          id: 'user_mock',
          phoneE164: verificationId.replace(/^mock_/, ''),
          displayName: 'Demo User',
          createdAt: new Date().toISOString(),
          entitlements: { isPremium: false, features: {} },
        }),
      });
      return;
    }
    // Ignore code for now; backend does direct login by phone/email.
    const data = await requestJson<VerifyOtpResponse>('/v1/auth/login', {
      method: 'POST',
      body: { phoneE164: verificationId },
      auth: false,
    });

    const accessToken = data.accessToken ?? data.tokens?.accessToken;
    if (!accessToken) throw new Error('Login failed');
    await setTokens({
      accessToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    // Fetch user profile (and default entitlements if backend doesn't provide them)
    const user = await requestJson<any>('/v1/users/me', { auth: true });
    set({ status: 'signedIn', user: normalizeUser(user) });
  },

  refreshMe: async () => {
    if (get().status !== 'signedIn') return;
    const user = await requestJson<any>('/v1/users/me', { auth: true });
    set({ user: normalizeUser(user) });
  },

  signOut: async () => {
    await clearTokens();
    set({ status: 'signedOut', user: null });
  },
}));

function normalizeUser(u: any): User {
  return {
    id: String(u?.id ?? ''),
    phoneE164: String(u?.phoneE164 ?? u?.phone_e164 ?? ''),
    displayName: u?.displayName ?? u?.display_name ?? undefined,
    createdAt: String(u?.createdAt ?? u?.created_at ?? new Date().toISOString()),
    entitlements: {
      isPremium: Boolean(u?.entitlements?.isPremium ?? u?.isPremium ?? false),
      features: (u?.entitlements?.features ?? u?.features ?? {}) as Record<string, boolean>,
    },
  };
}
