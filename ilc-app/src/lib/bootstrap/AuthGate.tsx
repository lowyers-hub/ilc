import { router, useSegments } from 'expo-router';
import React from 'react';

import { useAuthStore } from '@/src/lib/stores/authStore';

export function AuthGate() {
  const segments = useSegments();
  const status = useAuthStore((s) => s.status);

  React.useEffect(() => {
    if (status === 'unknown') return;

    const inAuthGroup = segments[0] === '(auth)';

    if (status !== 'signedIn' && !inAuthGroup) {
      router.replace('/(auth)/phone');
      return;
    }

    if (status === 'signedIn' && inAuthGroup) {
      router.replace('/(tabs)/chat');
    }
  }, [segments, status]);

  return null;
}

