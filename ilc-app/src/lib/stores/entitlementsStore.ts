import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { requestJson } from '@/src/lib/api/client';
import { env } from '@/src/lib/env';
import { logEvent } from '@/src/lib/telemetry/analytics';

export type BlockedAction = {
  type: 'document_analysis' | 'draft' | 'voice';
  feature: 'document_analysis' | 'draft' | 'voice';
  reason: string;
  timestamp: string; // ISO
};

export type EntitlementState = {
  isPremium: boolean;
  features: Record<string, boolean>;
  usage: {
    documentsAnalyzed: number; // risk analyses started today
    draftsCreated: number; // drafts created today
  };
  limits: {
    documentsPerDay: number;
    draftsPerDay: number;
  };

  lastResetDay: string; // YYYY-MM-DD
  lastBlockedAction: BlockedAction | null;
  countBlocked: number;

  refreshEntitlements: () => Promise<void>;
  canFeature: (featureKey: string) => boolean;

  canUseDocumentRiskNow: () => { ok: boolean; reason?: string };
  canCreateDraftNow: () => { ok: boolean; reason?: string };
  canUseVoiceNow: () => { ok: boolean; reason?: string };

  recordDocumentRiskUsed: () => void;
  recordDraftCreated: () => void;

  recordBlocked: (args: Omit<BlockedAction, 'timestamp'>) => void;
  ensureDailyReset: () => void;
};

function todayKey(d = new Date()) {
  // YYYY-MM-DD in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DEFAULT_LIMITS = { documentsPerDay: 2, draftsPerDay: 1 };

export const useEntitlementsStore = create<EntitlementState>()(
  persist(
    (set, get) => ({
      isPremium: false,
      features: {},
      usage: { documentsAnalyzed: 0, draftsCreated: 0 },
      limits: DEFAULT_LIMITS,
      lastResetDay: todayKey(),
      lastBlockedAction: null,
      countBlocked: 0,

      ensureDailyReset: () => {
        const key = todayKey();
        if (get().lastResetDay !== key) {
          set({
            lastResetDay: key,
            usage: { documentsAnalyzed: 0, draftsCreated: 0 },
          });
        }
      },

      refreshEntitlements: async () => {
        get().ensureDailyReset();

        if (env.useMockData) {
          // In demo: treat premium as false; keep some features premium-gated.
          set({
            isPremium: false,
            features: {
              'chat.voice': false, // optional premium feature
              'documents.riskAnalysis': true,
              'forum.posting': true,
            },
            limits: DEFAULT_LIMITS,
          });
          return;
        }

        try {
          // Backend may extend this contract later with usage/limits.
          const remote = await requestJson<any>('/v1/entitlements', { auth: true });
          set({
            isPremium: Boolean(remote?.isPremium),
            features: remote?.features ?? {},
            limits: remote?.limits ?? DEFAULT_LIMITS,
            usage: remote?.usage ?? get().usage,
          });
        } catch {
          // Friendly fallback: keep last known entitlements and avoid breaking UX if backend endpoint isn't ready.
          set((s) => ({ ...s }));
        }
      },

      canFeature: (featureKey: string) => {
        const features = get().features ?? {};
        return Boolean(features[featureKey]);
      },

      canUseDocumentRiskNow: () => {
        get().ensureDailyReset();
        if (get().isPremium) return { ok: true };
        if (!get().canFeature('documents.riskAnalysis')) return { ok: false, reason: 'feature_disabled' };
        if (get().usage.documentsAnalyzed >= get().limits.documentsPerDay) return { ok: false, reason: 'limit_reached' };
        return { ok: true };
      },

      canCreateDraftNow: () => {
        get().ensureDailyReset();
        if (get().isPremium) return { ok: true };
        if (get().usage.draftsCreated >= get().limits.draftsPerDay) return { ok: false, reason: 'limit_reached' };
        return { ok: true };
      },

      canUseVoiceNow: () => {
        // Optional premium feature. Free users can be blocked by feature flag.
        if (get().isPremium) return { ok: true };
        if (!get().canFeature('chat.voice')) return { ok: false, reason: 'premium_required' };
        return { ok: true };
      },

      recordDocumentRiskUsed: () => {
        get().ensureDailyReset();
        set((s) => ({ usage: { ...s.usage, documentsAnalyzed: s.usage.documentsAnalyzed + 1 } }));
      },

      recordDraftCreated: () => {
        get().ensureDailyReset();
        set((s) => ({ usage: { ...s.usage, draftsCreated: s.usage.draftsCreated + 1 } }));
      },

      recordBlocked: (args) => {
        const blocked: BlockedAction = { ...args, timestamp: new Date().toISOString() };
        set((s) => ({
          lastBlockedAction: blocked,
          countBlocked: s.countBlocked + 1,
        }));
        logEvent('blocked_action', { feature: args.feature, reason: args.reason });
      },
    }),
    {
      name: 'ilc.entitlements',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        // Persist only what matters offline; fetched flags can be refreshed.
        isPremium: s.isPremium,
        features: s.features,
        usage: s.usage,
        limits: s.limits,
        lastResetDay: s.lastResetDay,
        lastBlockedAction: s.lastBlockedAction,
        countBlocked: s.countBlocked,
      }),
    }
  )
);
