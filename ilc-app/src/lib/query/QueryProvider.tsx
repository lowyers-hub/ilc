import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { createQueryClient } from './queryClient';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => createQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

