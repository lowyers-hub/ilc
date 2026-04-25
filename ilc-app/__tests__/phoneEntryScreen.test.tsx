import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import PhoneEntryScreen from '@/app/(auth)/phone';

describe('PhoneEntryScreen', () => {
  it('navigates to OTP screen after sending code', async () => {
    const { getByText, getByPlaceholderText } = render(<PhoneEntryScreen />);

    // Update phone field
    fireEvent.changeText(getByPlaceholderText('+628123456789'), '+628111111111');

    fireEvent.press(getByText('Kirim OTP'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalled();
    });
  });
});
