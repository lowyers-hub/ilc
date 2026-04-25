import * as SecureStore from 'expo-secure-store';

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string; // ISO
};

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';
const EXPIRES_AT_KEY = 'auth.expiresAt';

export async function getTokens(): Promise<AuthTokens | null> {
  const [accessToken, refreshToken, expiresAt] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(EXPIRES_AT_KEY),
  ]);

  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: refreshToken ?? undefined,
    expiresAt: expiresAt ?? undefined,
  };
}

export async function setTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    tokens.refreshToken ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken) : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    tokens.expiresAt ? SecureStore.setItemAsync(EXPIRES_AT_KEY, tokens.expiresAt) : SecureStore.deleteItemAsync(EXPIRES_AT_KEY),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(EXPIRES_AT_KEY),
  ]);
}
