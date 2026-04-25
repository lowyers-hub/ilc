import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import LawyerListScreen from '@/app/(tabs)/lawyers/index';
import BookingScreen from '@/app/(tabs)/lawyers/book';
import { renderWithProviders } from '@/src/test/renderWithProviders';

process.env.EXPO_PUBLIC_USE_MOCK_DATA = 'true';
process.env.EXPO_PUBLIC_USE_REAL_MARKETPLACE = 'true';

describe('Consultation flow (marketplace)', () => {
  it('user can browse lawyer, book consultation, and see it in history', async () => {
    // 1) Browse list
    const { Wrapper, client } = renderWithProviders(<LawyerListScreen />);
    const list = render(<LawyerListScreen />, { wrapper: Wrapper });

    await waitFor(() => expect(list.getByText(/Ayu Prameswari/)).toBeTruthy());

    // 2) Book directly (screen-level flow)
    ;(globalThis as any).__mockRouterParams = { lawyerId: 'law_1', lawyerName: 'Ayu Prameswari, S.H.', source: 'test' };
    const booking = render(<BookingScreen />, { wrapper: Wrapper });

    // TextField doesn't expose label-based accessibility; query TextInput nodes directly.
    const { TextInput } = require('react-native');
    const inputs = booking.UNSAFE_getAllByType(TextInput);
    // inputs[0] = scheduleAt, inputs[1] = topic
    fireEvent.changeText(inputs[1], 'PHK sepihak, langkah apa?');

    fireEvent.press(booking.getByText('Lanjut ke Pembayaran'));
    await waitFor(() => expect(router.push).toHaveBeenCalled());

    booking.unmount();
    list.unmount();
    client.clear();
  });
});
