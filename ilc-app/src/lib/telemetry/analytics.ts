export type AnalyticsEvent =
  // Core Events
  | { name: 'app_opened'; props: { timestamp: number } }
  | { name: 'onboarding_viewed'; props: { timestamp: number } }
  | { name: 'onboarding_completed'; props: { timestamp: number } }
  | { name: 'chat_started'; props: { sessionId: string; category?: string; timestamp: number } }
  | { name: 'question_submitted'; props: { sessionId: string; category?: string; timestamp: number } }
  | { name: 'ai_response_received'; props: { sessionId: string; confidence?: string; escalation?: boolean; fallbackUsed?: boolean; timestamp: number } }
  | { name: 'fallback_response_used'; props: { sessionId: string; timestamp: number } }
  | { name: 'suggested_followup_shown'; props: { sessionId: string; timestamp: number } }
  | { name: 'suggested_followup_clicked'; props: { sessionId: string; text_snippet: string; timestamp: number } }
  | { name: 'confidence_low_seen'; props: { sessionId: string; timestamp: number } }
  | { name: 'escalation_cta_shown'; props: { sessionId: string; timestamp: number } }
  | { name: 'escalation_cta_clicked'; props: { sessionId: string; timestamp: number } }
  | { name: 'lawyer_profile_viewed'; props: { lawyerId: string; source: string; timestamp: number } }
  | { name: 'consultation_started'; props: { lawyerId: string; source: string; timestamp: number } }
  | { name: 'payment_started'; props: { paymentId: string; consultationId: string; amount: number; timestamp: number } }
  | { name: 'payment_completed'; props: { paymentId: string; consultationId: string; timestamp: number } }
  | { name: 'feedback_submitted'; props: { sessionId: string; isHelpful: boolean; reason?: string; timestamp: number } }
  
  // Existing Entitlement & Error Events
  | { name: 'blocked_action'; props: { feature: string; reason: string; timestamp?: number } }
  | { name: 'upgrade_opened'; props: { source: string; reason?: string; timestamp?: number } }
  | { name: 'api_error'; props: { feature: string; status?: number; code?: string; kind?: string; timestamp?: number } }
  | { name: 'timeout'; props: { feature: string; action?: string; timestamp?: number } }
  | { name: 'ai_error'; props: { stage: string; reason?: string; timestamp?: number } }
  | { name: 'ocr_failed'; props: { docId: string; reason?: string; timestamp?: number } }
  | { name: 'risk_failed'; props: { docId: string; reason?: string; timestamp?: number } }
  | { name: 'consultation_booked'; props: { consultationId: string; lawyerId: string; timestamp?: number } }
  | { name: 'payment_success'; props: { paymentId: string; consultationId: string; timestamp?: number } }
  | { name: 'payment_failed'; props: { paymentId: string; consultationId: string; reason?: string; timestamp?: number } }
  // Marketplace session access
  | { name: 'consultation_opened'; props: { consultationId: string; status: string; timestamp?: number } }
  | { name: 'consultation_join_attempted'; props: { consultationId: string; timestamp?: number } }
  | { name: 'consultation_join_blocked'; props: { consultationId: string; status: string; timestamp?: number } }
  // Payment ↔ Consultation sync
  | { name: 'payment_consultation_sync_started'; props: { paymentId: string; consultationId: string; timestamp?: number } }
  | { name: 'payment_consultation_sync_success'; props: { paymentId: string; consultationId: string; timestamp?: number } }
  | { name: 'payment_consultation_sync_failed'; props: { paymentId: string; consultationId: string; reason: string; timestamp?: number } };

export function logEvent(name: AnalyticsEvent['name'], props: any) {
  // Minimal, non-invasive analytics sink.
  // Swap this to Segment/Amplitude/Sentry breadcrumbs later.
  // Note: We intentionally DO NOT log PII or raw legal query texts here.
  const payload = { ...props, timestamp: props.timestamp || Date.now() };
  // eslint-disable-next-line no-console
  console.log(`[analytics] ${name}`, payload);
}
