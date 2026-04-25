import { router } from 'expo-router';

import { logEvent } from '@/src/lib/telemetry/analytics';

export type UpgradeContext = {
  feature: 'document_analysis' | 'draft' | 'voice';
  reason: string;
};

export function openUpgrade(ctx: UpgradeContext) {
  logEvent('upgrade_opened', { source: ctx.feature, reason: ctx.reason });
  router.push({ pathname: '/upgrade', params: ctx });
}

