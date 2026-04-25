import { env } from '@/src/lib/env';
import { requestJson } from '@/src/lib/api/client';
import type { Payment } from '@/src/types/models';

import { __mockGetConsultation, __mockUpdateConsultation } from '@/src/features/marketplace/marketplaceApi';

type CreatePaymentResponse = { payment: Payment };

let mockPayments: Payment[] = [];

function shouldUseMock() {
  return env.useMockData || !env.useRealMarketplace;
}

export async function createPayment(args: { consultationId: string; amount: number }): Promise<Payment> {
  if (shouldUseMock()) {
    const p: Payment = {
      id: `pay_${Date.now()}`,
      consultationId: args.consultationId,
      amount: args.amount,
      currency: 'IDR',
      status: 'requires_action',
      checkoutUrl: 'https://payments.example.com/checkout/mock',
      createdAt: new Date().toISOString(),
    };
    mockPayments = [p, ...mockPayments];
    __mockUpdateConsultation(args.consultationId, { paymentId: p.id });
    return p;
  }

  const res = await requestJson<CreatePaymentResponse>('/v1/payments/create', {
    method: 'POST',
    auth: true,
    body: args,
    timeoutMs: 20_000,
    timeoutLabel: 'payments.create',
  });
  return res.payment;
}

export async function getPayment(paymentId: string): Promise<Payment> {
  if (shouldUseMock()) {
    const p = mockPayments.find((x) => x.id === paymentId);
    if (!p) throw new Error('Not found');
    return p;
  }
  return requestJson<Payment>(`/v1/payments/${paymentId}`, { auth: true, timeoutMs: 15_000, timeoutLabel: 'payments.get' });
}

// Test/helper only: mutate mock payment state without side effects.
export function __mockUpdatePayment(paymentId: string, patch: Partial<Payment>) {
  mockPayments = mockPayments.map((p) => (p.id === paymentId ? ({ ...p, ...patch } as Payment) : p));
}

// Client-side simulation of a gateway success. Real impl: payment provider redirects + backend webhook updates.
export async function simulatePaymentSuccess(paymentId: string): Promise<Payment> {
  if (!shouldUseMock()) return getPayment(paymentId);

  const p = mockPayments.find((x) => x.id === paymentId);
  if (!p) throw new Error('Not found');
  const updated: Payment = { ...p, status: 'paid' };
  mockPayments = mockPayments.map((x) => (x.id === paymentId ? updated : x));

  // Move consultation along state machine
  const c = __mockGetConsultation(p.consultationId);
  if (c) {
    __mockUpdateConsultation(c.id, { status: 'paid' });
    __mockUpdateConsultation(c.id, { status: 'confirmed' });
  }

  return updated;
}

export async function simulatePaymentFailed(paymentId: string): Promise<Payment> {
  if (!shouldUseMock()) return getPayment(paymentId);
  const p = mockPayments.find((x) => x.id === paymentId);
  if (!p) throw new Error('Not found');
  const updated: Payment = { ...p, status: 'failed' };
  mockPayments = mockPayments.map((x) => (x.id === paymentId ? updated : x));
  return updated;
}
