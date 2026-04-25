import React from 'react';

import { useAuthStore } from '@/src/lib/stores/authStore';
import { useEntitlementsStore } from '@/src/lib/stores/entitlementsStore';

export function AppBootstrap() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const status = useAuthStore((s) => s.status);
  const refreshEntitlements = useEntitlementsStore((s) => s.refreshEntitlements);

  React.useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  React.useEffect(() => {
    if (status === 'signedIn') {
      refreshEntitlements().catch(() => {
        // Entitlements are optional; UI will gate conservatively.
      });
    }
  }, [status, refreshEntitlements]);

  return null;
}
