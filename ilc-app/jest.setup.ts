import 'whatwg-fetch';

// Stable default envs for tests.
process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost';
process.env.EXPO_PUBLIC_USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_DATA ?? 'true';

// Minimal in-memory mock for expo-secure-store.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: async (k: string) => store.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => {
      store.set(k, v);
    },
    deleteItemAsync: async (k: string) => {
      store.delete(k);
    },
  };
});

jest.mock('@react-native-async-storage/async-storage', () => {
  let data: Record<string, string> = {};
  return {
    setItem: async (key: string, value: string) => {
      data[key] = value;
    },
    getItem: async (key: string) => data[key] ?? null,
    removeItem: async (key: string) => {
      delete data[key];
    },
    clear: async () => {
      data = {};
    },
  };
});

// expo-router navigation is not exercised in unit tests; provide safe stubs.
jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useSegments: () => [],
    useLocalSearchParams: () => (globalThis as any).__mockRouterParams ?? {},
  };
});

// Minimal mock for expo-av audio recording in tests.
jest.mock('expo-av', () => {
  return {
    Audio: {
      requestPermissionsAsync: async () => ({ granted: true }),
      setAudioModeAsync: async () => {},
      RecordingOptionsPresets: { HIGH_QUALITY: {} },
      Recording: {
        createAsync: async () => ({
          recording: {
            stopAndUnloadAsync: async () => {},
            getURI: () => 'file://mock-voice.m4a',
          },
        }),
      },
    },
  };
});
