import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

// Ensure chat is in mock mode, but voice transcription uses the real flow (we'll mock API).
process.env.EXPO_PUBLIC_USE_MOCK_DATA = 'true';
process.env.EXPO_PUBLIC_USE_REAL_TRANSCRIPTION = 'true';

jest.mock('@/src/features/voice/voiceApi', () => ({
  transcribeAudio: jest.fn(async () => ({ text: 'Ini hasil transkripsi.' })),
}));

import ChatThreadScreen from '@/app/(tabs)/chat/[sessionId]';
import { useEntitlementsStore } from '@/src/lib/stores/entitlementsStore';
import { renderWithProviders } from '@/src/test/renderWithProviders';

describe('Voice transcription → populates composer', () => {
  it('records and fills the input with transcription', async () => {
    (globalThis as any).__mockRouterParams = { sessionId: 'sess_1' };
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    useEntitlementsStore.setState({
      isPremium: true,
      features: { 'chat.voice': true, 'documents.riskAnalysis': true },
      usage: { documentsAnalyzed: 0, draftsCreated: 0 },
      limits: { documentsPerDay: 2, draftsPerDay: 1 },
      lastResetDay: todayKey,
    } as any);

    const { Wrapper, client } = renderWithProviders(<ChatThreadScreen />);
    const r = render(<ChatThreadScreen />, { wrapper: Wrapper });

    // Tap to start recording
    await act(async () => {
      fireEvent.press(r.getByTestId('voice-button'));
      // flush microtasks from async recording setup
      await Promise.resolve();
    });
    await waitFor(() => expect(r.getByTestId('recording-indicator')).toBeTruthy(), { timeout: 2000 });
    // Tap again to stop + transcribe
    fireEvent.press(r.getByTestId('voice-button'));

    await waitFor(() => {
      expect(r.getByTestId('chat-composer-input').props.value).toBe('Ini hasil transkripsi.');
    });

    r.unmount();
    client.clear();
  });
});
