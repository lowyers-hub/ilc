import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import DocumentDetailScreen from '@/app/(tabs)/documents/[docId]';
import { createDocument } from '@/src/features/documents/documentsApi';
import { renderWithProviders } from '@/src/test/renderWithProviders';

// Test uses mock fallback (no backend). This validates the state machine + polling behavior.
process.env.EXPO_PUBLIC_USE_MOCK_DATA = 'true';
process.env.EXPO_PUBLIC_USE_REAL_DOCUMENT_ANALYSIS = 'true';

describe('Document analysis flow (mock pipeline w/ polling)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('upload -> uploaded -> start OCR -> processing -> ready and UI updates', async () => {
    const doc = await createDocument({
      uri: 'file://demo.pdf',
      name: 'demo.pdf',
      mimeType: 'application/pdf',
      source: 'file',
    });

    (globalThis as any).__mockRouterParams = { docId: doc.id };

    const { Wrapper } = renderWithProviders(<DocumentDetailScreen />);
    const r = render(<DocumentDetailScreen />, { wrapper: Wrapper });

    // OCR not started yet -> shows start button
    expect(r.getByText('Mulai OCR')).toBeTruthy();

    fireEvent.press(r.getByText('Mulai OCR'));
    await waitFor(() => expect(r.getByText('Memproses OCR…')).toBeTruthy());

    // Advance time past mock processing window (see documentsApi.ts)
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(r.getByText('Hasil OCR')).toBeTruthy();
      expect(r.getByText(/Hasil OCR \(demo\)/)).toBeTruthy();
    });
  });
});

