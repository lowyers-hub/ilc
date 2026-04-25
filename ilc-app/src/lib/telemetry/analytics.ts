export type AnalyticsEvent =
  | { name: 'blocked_action'; props: { feature: string; reason: string } }
  | { name: 'upgrade_opened'; props: { source: string; reason?: string } }
  | { name: 'api_error'; props: { feature: string; status?: number; code?: string; kind?: string } }
  | { name: 'timeout'; props: { feature: string; action?: string } }
  | { name: 'ai_error'; props: { stage: string; reason?: string } }
  | { name: 'ocr_failed'; props: { docId: string; reason?: string } }
  | { name: 'risk_failed'; props: { docId: string; reason?: string } }
  | { name: 'consultation_started'; props: { lawyerId: string; source: string } }
  | { name: 'consultation_booked'; props: { consultationId: string; lawyerId: string } }
  | { name: 'payment_started'; props: { paymentId: string; consultationId: string; amount: number } }
  | { name: 'payment_success'; props: { paymentId: string; consultationId: string } }
  | { name: 'payment_failed'; props: { paymentId: string; consultationId: string; reason?: string } }
  // Marketplace session access
  | { name: 'consultation_opened'; props: { consultationId: string; status: string } }
  | { name: 'consultation_join_attempted'; props: { consultationId: string } }
  | { name: 'consultation_join_blocked'; props: { consultationId: string; status: string } }
  // Payment ↔ Consultation sync
  | { name: 'payment_consultation_sync_started'; props: { paymentId: string; consultationId: string } }
  | { name: 'payment_consultation_sync_success'; props: { paymentId: string; consultationId: string } }
  | { name: 'payment_consultation_sync_failed'; props: { paymentId: string; consultationId: string; reason: string } };

export function logEvent(name: AnalyticsEvent['name'], props: any) {
  // Minimal, non-invasive analytics sink.
  // Swap this to Segment/Amplitude/Sentry breadcrumbs later.
  // eslint-disable-next-line no-console
  console.log(`[analytics] ${name}`, props);
}
