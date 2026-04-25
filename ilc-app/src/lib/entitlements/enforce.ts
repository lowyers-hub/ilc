import { openUpgrade, type UpgradeContext } from '@/src/lib/paywall/openUpgrade';
import { useEntitlementsStore } from '@/src/lib/stores/entitlementsStore';

export class EntitlementError extends Error {
  code: 'ENTITLEMENT_BLOCKED';
  ctx: UpgradeContext;

  constructor(ctx: UpgradeContext, message: string) {
    super(message);
    this.name = 'EntitlementError';
    this.code = 'ENTITLEMENT_BLOCKED';
    this.ctx = ctx;
  }
}

const DEFAULT_MESSAGE = 'Dokumen tidak dapat dianalisis, coba ulangi atau gunakan file lain.';

export function enforceDocumentRiskOrThrow() {
  const st = useEntitlementsStore.getState();
  const check = st.canUseDocumentRiskNow();
  if (check.ok) return;

  st.recordBlocked({ type: 'document_analysis', feature: 'document_analysis', reason: check.reason ?? 'blocked' });
  const ctx: UpgradeContext = { feature: 'document_analysis', reason: check.reason ?? 'blocked' };
  openUpgrade(ctx);
  throw new EntitlementError(ctx, DEFAULT_MESSAGE);
}

export function enforceDraftOrThrow() {
  const st = useEntitlementsStore.getState();
  const check = st.canCreateDraftNow();
  if (check.ok) return;

  st.recordBlocked({ type: 'draft', feature: 'draft', reason: check.reason ?? 'blocked' });
  const ctx: UpgradeContext = { feature: 'draft', reason: check.reason ?? 'blocked' };
  openUpgrade(ctx);
  throw new EntitlementError(ctx, 'Anda telah mencapai batas pembuatan draft hari ini.');
}

export function enforceVoiceOrThrow() {
  const st = useEntitlementsStore.getState();
  const check = st.canUseVoiceNow();
  if (check.ok) return;

  st.recordBlocked({ type: 'voice', feature: 'voice', reason: check.reason ?? 'blocked' });
  const ctx: UpgradeContext = { feature: 'voice', reason: check.reason ?? 'blocked' };
  openUpgrade(ctx);
  throw new EntitlementError(ctx, 'Fitur voice input tersedia untuk premium.');
}

