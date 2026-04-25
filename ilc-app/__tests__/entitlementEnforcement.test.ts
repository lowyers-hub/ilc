import { router } from 'expo-router';

import { enforceDocumentRiskOrThrow, enforceDraftOrThrow, enforceVoiceOrThrow } from '@/src/lib/entitlements/enforce';
import { useEntitlementsStore } from '@/src/lib/stores/entitlementsStore';

describe('Entitlement enforcement', () => {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  beforeEach(() => {
    (router.push as any).mockClear?.();
    useEntitlementsStore.setState({
      isPremium: false,
      features: { 'documents.riskAnalysis': true, 'chat.voice': false },
      usage: { documentsAnalyzed: 0, draftsCreated: 0 },
      limits: { documentsPerDay: 1, draftsPerDay: 1 },
      lastResetDay: todayKey,
      lastBlockedAction: null,
      countBlocked: 0,
    } as any);
  });

  it('blocks free user when document risk limit reached and triggers upgrade', () => {
    useEntitlementsStore.setState({ usage: { documentsAnalyzed: 1, draftsCreated: 0 } } as any);
    expect(() => enforceDocumentRiskOrThrow()).toThrow();
    expect(router.push).toHaveBeenCalled();
    expect(useEntitlementsStore.getState().countBlocked).toBe(1);
  });

  it('allows premium user for document risk even if over limit', () => {
    useEntitlementsStore.setState({ isPremium: true, usage: { documentsAnalyzed: 99, draftsCreated: 0 } } as any);
    expect(() => enforceDocumentRiskOrThrow()).not.toThrow();
  });

  it('blocks free user when draft limit reached and triggers upgrade', () => {
    useEntitlementsStore.setState({ usage: { documentsAnalyzed: 0, draftsCreated: 1 } } as any);
    expect(() => enforceDraftOrThrow()).toThrow();
    expect(router.push).toHaveBeenCalled();
  });

  it('blocks voice when premium required and triggers upgrade', () => {
    expect(() => enforceVoiceOrThrow()).toThrow();
    expect(router.push).toHaveBeenCalled();
  });
});
