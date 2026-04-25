import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import BookingScreen from '@/app/(tabs)/lawyers/book';
import PaymentScreen from '@/app/(tabs)/lawyers/payment';
import HistoryScreen from '@/app/(tabs)/lawyers/history';
import { renderWithProviders } from '@/src/test/renderWithProviders';

process.env.EXPO_PUBLIC_USE_MOCK_DATA = 'true';
process.env.EXPO_PUBLIC_USE_REAL_MARKETPLACE = 'true';

describe('Payment flow', () => {
  it('booking -> payment -> success updates history status', async () => {
    const { Wrapper, client } = renderWithProviders(<BookingScreen />);

    // Step A: Booking creates consultation + payment and navigates to payment screen
    ;(globalThis as any).__mockRouterParams = { lawyerId: 'law_1', lawyerName: 'Ayu Prameswari, S.H.', source: 'test' };
    const booking = render(<BookingScreen />, { wrapper: Wrapper });

    const { TextInput } = require('react-native');
    const inputs = booking.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[1], 'Konsultasi urgent');
    fireEvent.press(booking.getByText('Lanjut ke Pembayaran'));

    await waitFor(() => expect(router.push).toHaveBeenCalled());

    const call = (router.push as any).mock.calls[(router.push as any).mock.calls.length - 1][0];
    const paymentId = call.params.paymentId;
    const consultationId = call.params.consultationId;

    // Step B: Simulate payment success
    ;(globalThis as any).__mockRouterParams = { paymentId, consultationId, amount: call.params.amount, lawyerName: call.params.lawyerName };
    const pay = render(<PaymentScreen />, { wrapper: Wrapper });
    fireEvent.press(pay.getByText('Bayar Sekarang (simulasi sukses)'));

    await waitFor(() => expect(router.replace).toHaveBeenCalled());

    // Step C: History reflects confirmed
    const history = render(<HistoryScreen />, { wrapper: Wrapper });
    await waitFor(() => expect(history.getByText(/confirmed|paid/i)).toBeTruthy());

    history.unmount();
    pay.unmount();
    booking.unmount();
    client.clear();
  });
});

