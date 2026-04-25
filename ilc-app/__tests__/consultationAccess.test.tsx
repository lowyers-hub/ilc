import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import ConsultationDetailScreen from '@/app/(tabs)/lawyers/consultation/[consultationId]';
import HistoryScreen from '@/app/(tabs)/lawyers/history';
import { createConsultation, __mockGetConsultation } from '@/src/features/marketplace/marketplaceApi';
import { createPayment, simulatePaymentSuccess } from '@/src/features/payments/paymentsApi';
import { renderWithProviders } from '@/src/test/renderWithProviders';

process.env.EXPO_PUBLIC_USE_MOCK_DATA = 'true';
process.env.EXPO_PUBLIC_USE_REAL_MARKETPLACE = 'true';

describe('Consultation access enforcement', () => {
  it('pending_payment cannot join and shows CTA to payment status', async () => {
    const c = await createConsultation({
      lawyerId: 'law_1',
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      topic: 'Test',
    });
    const p = await createPayment({ consultationId: c.id, amount: c.price });

    ;(globalThis as any).__mockRouterParams = { consultationId: c.id };
    const { Wrapper, client } = renderWithProviders(<ConsultationDetailScreen />);
    const r = render(<ConsultationDetailScreen />, { wrapper: Wrapper });

    await waitFor(() => expect(r.getByText('Cek Status Pembayaran')).toBeTruthy());
    fireEvent.press(r.getByText('Cek Status Pembayaran'));
    expect(router.push).toHaveBeenCalled();

    r.unmount();
    client.clear();
  });

  it('confirmed can join', async () => {
    const c = await createConsultation({
      lawyerId: 'law_1',
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      topic: 'Test2',
    });
    const p = await createPayment({ consultationId: c.id, amount: c.price });
    await simulatePaymentSuccess(p.id);
    const after = __mockGetConsultation(c.id);
    expect(after?.status).toBe('confirmed');

    ;(globalThis as any).__mockRouterParams = { consultationId: c.id };
    const { Wrapper, client } = renderWithProviders(<ConsultationDetailScreen />);
    const r = render(<ConsultationDetailScreen />, { wrapper: Wrapper });

    await waitFor(() => expect(r.getByText('Join Session')).toBeTruthy());
    fireEvent.press(r.getByText('Join Session'));
    expect(router.push).toHaveBeenCalled();

    r.unmount();
    client.clear();
  });

  it('history item opens consultation detail', async () => {
    const c = await createConsultation({
      lawyerId: 'law_1',
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      topic: 'From history',
    });
    await createPayment({ consultationId: c.id, amount: c.price });

    const { Wrapper, client } = renderWithProviders(<HistoryScreen />);
    const r = render(<HistoryScreen />, { wrapper: Wrapper });

    await waitFor(() => expect(r.getByText(/From history/)).toBeTruthy());
    fireEvent.press(r.getByText(/From history/));
    expect(router.push).toHaveBeenCalled();

    r.unmount();
    client.clear();
  });
});
