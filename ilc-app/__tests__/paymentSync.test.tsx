import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import PaymentStatusScreen from '@/app/(tabs)/lawyers/payment-status';
import { createConsultation } from '@/src/features/marketplace/marketplaceApi';
import { createPayment, __mockUpdatePayment } from '@/src/features/payments/paymentsApi';
import { env } from '@/src/lib/env';
import { renderWithProviders } from '@/src/test/renderWithProviders';

describe('Payment ↔ Consultation sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Force mock mode in-memory for deterministic tests
    (env as any).useMockData = true;
    (env as any).useRealMarketplace = true;
  });

  it('shows mismatch message when payment is paid but consultation still pending_payment', async () => {
    (env as any).autoConfirmConsultation = false;

    const c = await createConsultation({
      lawyerId: 'law_1',
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      topic: 'Sync test',
    });
    const p = await createPayment({ consultationId: c.id, amount: c.price });
    __mockUpdatePayment(p.id, { status: 'paid' }); // mismatch: do not update consultation

    (globalThis as any).__mockRouterParams = { paymentId: p.id, consultationId: c.id };
    const { Wrapper, client } = renderWithProviders(<PaymentStatusScreen />);
    const r = render(<PaymentStatusScreen />, { wrapper: Wrapper });

    await waitFor(() => expect(r.getByText('Menunggu konfirmasi sistem')).toBeTruthy());

    r.unmount();
    client.clear();
  });

  it('auto-confirms (flagged) and navigates to consultation detail', async () => {
    (env as any).autoConfirmConsultation = true;

    const c = await createConsultation({
      lawyerId: 'law_1',
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      topic: 'Auto confirm',
    });
    const p = await createPayment({ consultationId: c.id, amount: c.price });
    __mockUpdatePayment(p.id, { status: 'paid' }); // triggers auto confirm

    (globalThis as any).__mockRouterParams = { paymentId: p.id, consultationId: c.id };
    const { Wrapper, client } = renderWithProviders(<PaymentStatusScreen />);
    const r = render(<PaymentStatusScreen />, { wrapper: Wrapper });

    await waitFor(() => expect(router.replace).toHaveBeenCalled());

    r.unmount();
    client.clear();
  });

  it('shows retry CTA after 10s mismatch and hides it when pressed', async () => {
    jest.useFakeTimers();
    (env as any).autoConfirmConsultation = false;

    const c = await createConsultation({
      lawyerId: 'law_1',
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      topic: 'Retry',
    });
    const p = await createPayment({ consultationId: c.id, amount: c.price });
    __mockUpdatePayment(p.id, { status: 'paid' });

    (globalThis as any).__mockRouterParams = { paymentId: p.id, consultationId: c.id };
    const { Wrapper, client } = renderWithProviders(<PaymentStatusScreen />);
    const r = render(<PaymentStatusScreen />, { wrapper: Wrapper });

    await waitFor(() => expect(r.getByText('Menunggu konfirmasi sistem')).toBeTruthy());

    await act(async () => {
      jest.advanceTimersByTime(11_000);
    });

    await waitFor(() => expect(r.getByText('Coba Sinkronisasi Lagi')).toBeTruthy());
    fireEvent.press(r.getByText('Coba Sinkronisasi Lagi'));

    await waitFor(() => expect(r.queryByText('Coba Sinkronisasi Lagi')).toBeNull());

    r.unmount();
    client.clear();
    jest.useRealTimers();
  });
});
